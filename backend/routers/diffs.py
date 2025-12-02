from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, database
import json

router = APIRouter(
    prefix="/contracts/{contract_id}/versions/{version_id}/diff",
    tags=["diffs"],
)

@router.get("/", response_model=schemas.DiffResponse)
def get_diff(contract_id: int, version_id: int, compare_with: int = None, db: Session = Depends(database.get_db)):
    # Get current version (Target)
    version = db.query(models.Version).filter(models.Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Get comparison version (Base)
    if compare_with:
        previous_version = db.query(models.Version).filter(models.Version.id == compare_with).first()
        if not previous_version:
             raise HTTPException(status_code=404, detail="Comparison version not found")
    else:
        # Default to previous version
        previous_version = db.query(models.Version).filter(
            models.Version.contract_id == contract_id,
            models.Version.version_number < version.version_number
        ).order_by(models.Version.version_number.desc()).first()

    if not previous_version:
        return {
            "id": 0,
            "content": "[]",
            "summary": "First version. No changes to compare."
        }

    # Generate Diff
    try:
        from lib.diff_engine import compare_versions
        
        raw_diffs = compare_versions(previous_version.file_path, version.file_path)
        
        # Log comparison
        log_details = json.dumps({
            "base_version": previous_version.version_number,
            "target_version": version.version_number,
            "base_id": previous_version.id,
            "target_id": version.id
        })
        
        log = models.OperationLog(
            contract_id=contract_id,
            action="compare_versions",
            details=log_details
        )
        db.add(log)
        db.commit()

        return {
            "id": 0, # Placeholder ID
            "content": json.dumps(raw_diffs),
            "summary": "" # Empty summary for raw diff
        }
        
        # Log comparison (only if explicit comparison or successful implicit)
        # Note: We can't log after return, so we do it before.
        # But we want to avoid logging on every page refresh if possible? 
        # For now, let's log it. It's an "Operation".
        
        # Check if log already exists for this specific comparison recently? 
        # No, let's just log it.
        
    except Exception as e:
        print(f"Diff generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Diff generation failed: {str(e)}")

@router.get("/analysis", response_model=schemas.AnalysisResponse)
def get_analysis(contract_id: int, version_id: int, compare_with: int = None, db: Session = Depends(database.get_db)):
    # Get current version (Target)
    version = db.query(models.Version).filter(models.Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Get comparison version (Base)
    if compare_with:
        previous_version = db.query(models.Version).filter(models.Version.id == compare_with).first()
        if not previous_version:
             raise HTTPException(status_code=404, detail="Comparison version not found")
    else:
        # Default to previous version
        previous_version = db.query(models.Version).filter(
            models.Version.contract_id == contract_id,
            models.Version.version_number < version.version_number
        ).order_by(models.Version.version_number.desc()).first()

    if not previous_version:
        return {
            "summary": "First version. No analysis needed.",
            "risk_assessments": {}
        }

    # Generate Analysis
    try:
        from lib.diff_engine import compare_versions
        from lib.ai_engine import analyze_diffs
        
        raw_diffs = compare_versions(previous_version.file_path, version.file_path)
        ai_result = analyze_diffs(raw_diffs)
        
        return ai_result
        
    except Exception as e:
        print(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
