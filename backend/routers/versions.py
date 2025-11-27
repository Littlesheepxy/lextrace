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
    db_version = models.Version(
        contract_id=contract_id,
        version_number=new_version_number,
        file_path=file_path,
        commit_message=commit_message,
        html_content=html_content
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
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version
