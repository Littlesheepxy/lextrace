from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
import shutil
import os

router = APIRouter(
    prefix="/contracts/{contract_id}/versions",
    tags=["versions"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=schemas.Version)
def create_version(
    contract_id: int,
    file: UploadFile = File(...),
    commit_message: str = Form(...),
    db: Session = Depends(database.get_db)
):
    # Verify contract exists
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Determine version number
    last_version = db.query(models.Version).filter(models.Version.contract_id == contract_id).order_by(models.Version.version_number.desc()).first()
    new_version_number = 1 if not last_version else last_version.version_number + 1

    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"{contract_id}_v{new_version_number}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Generate HTML using custom renderer
    from ..lib.html_renderer import render_document_to_html
    
    try:
        html_content = render_document_to_html(file_path)
    except Exception as e:
        print(f"HTML rendering failed: {e}")
        html_content = "<p>Error rendering document.</p>"

    # Create version record
    from datetime import datetime, timezone
    
    db_version = models.Version(
        contract_id=contract_id,
        version_number=new_version_number,
        file_path=file_path,
        commit_message=commit_message,
        html_content=html_content,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)

    # Log upload
    log = models.OperationLog(
        contract_id=contract_id,
        action="upload_version",
        details=f"Uploaded v{new_version_number}: {commit_message}"
    )
    db.add(log)
    db.commit()
    
    return db_version

@router.get("/", response_model=List[schemas.Version])
def read_versions(contract_id: int, db: Session = Depends(database.get_db)):
    versions = db.query(models.Version).filter(models.Version.contract_id == contract_id).order_by(models.Version.version_number.desc()).all()
    return versions

@router.get("/{version_id}", response_model=schemas.Version)
def read_version(contract_id: int, version_id: int, db: Session = Depends(database.get_db)):
    version = db.query(models.Version).filter(
        models.Version.id == version_id,
        models.Version.contract_id == contract_id
    ).first()
    return version

@router.delete("/{version_id}", status_code=204)
def delete_version(contract_id: int, version_id: int, db: Session = Depends(database.get_db)):
    version = db.query(models.Version).filter(
        models.Version.id == version_id,
        models.Version.contract_id == contract_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    # Delete file
    if version.file_path and os.path.exists(version.file_path):
        try:
            os.remove(version.file_path)
        except OSError as e:
            print(f"Error deleting file {version.file_path}: {e}")
            
    db.delete(version)
    db.commit()
    
    # Log deletion
    log = models.OperationLog(
        contract_id=contract_id,
        action="delete_version",
        details=f"Deleted version v{version.version_number}"
    )
    db.add(log)
    db.commit()
    
    return None

@router.post("/batch-stage")
def stage_batch_versions(
    contract_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db)
):
    # Verify contract exists
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    staging_dir = os.path.join(UPLOAD_DIR, "staging", str(contract_id))
    os.makedirs(staging_dir, exist_ok=True)

    staged_files = []
    
    from ..lib.date_extractor import extract_date_from_docx
    import uuid

    for file in files:
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        temp_filename = f"{file_id}{file_ext}"
        file_path = os.path.join(staging_dir, temp_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        detected_date = extract_date_from_docx(file_path)
        
        staged_files.append({
            "file_id": file_id,
            "original_filename": file.filename,
            "detected_date": detected_date.isoformat() if detected_date else None,
            "temp_path": file_path
        })
        
    # Sort by date (oldest first) if possible
    staged_files.sort(key=lambda x: x['detected_date'] or "")

    return staged_files

@router.post("/batch-commit")
def commit_batch_versions(
    contract_id: int,
    files: List[schemas.BatchCommitFile],
    db: Session = Depends(database.get_db)
):
    # Verify contract exists
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Get current latest version number
    last_version = db.query(models.Version).filter(models.Version.contract_id == contract_id).order_by(models.Version.version_number.desc()).first()
    next_version_number = (last_version.version_number + 1) if last_version else 1

    created_versions = []
    
    from ..lib.html_renderer import render_document_to_html
    from datetime import datetime, timezone

    for file_data in files:
        staging_path = os.path.join(UPLOAD_DIR, "staging", str(contract_id), f"{file_data.file_id}{os.path.splitext(file_data.original_filename)[1]}")
        
        if not os.path.exists(staging_path):
            continue # Skip if file missing

        # Move to permanent location
        final_filename = f"{contract_id}_v{next_version_number}_{file_data.original_filename}"
        final_path = os.path.join(UPLOAD_DIR, final_filename)
        shutil.move(staging_path, final_path)

        # Render HTML
        try:
            html_content = render_document_to_html(final_path)
        except Exception as e:
            print(f"HTML rendering failed: {e}")
            html_content = "<p>Error rendering document.</p>"

        # Create DB record
        # Ensure created_at is timezone-aware UTC
        if file_data.detected_date:
            # detected_date is ISO string (naive from date_extractor)
            # We treat it as UTC midnight implies 8am CN, or we could treat it as Local Midnight?
            # For simplicity and consistency, let's treat it as UTC for now, or better yet:
            # If we want "2023-05-12" to show as "2023-05-12" in UI, we should probably just use the date string?
            # But the UI expects a datetime.
            # Let's set it to UTC.
            dt = datetime.fromisoformat(file_data.detected_date)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            created_at = dt
        else:
            created_at = datetime.now(timezone.utc)

        db_version = models.Version(
            contract_id=contract_id,
            version_number=next_version_number,
            file_path=final_path,
            commit_message=file_data.commit_message or f"Batch upload: {file_data.original_filename}",
            html_content=html_content,
            created_at=created_at
        )
        db.add(db_version)
        created_versions.append(db_version)
        
        next_version_number += 1

    db.commit()
    
    # Cleanup staging dir
    staging_dir = os.path.join(UPLOAD_DIR, "staging", str(contract_id))
    if os.path.exists(staging_dir):
        shutil.rmtree(staging_dir)

    return created_versions
