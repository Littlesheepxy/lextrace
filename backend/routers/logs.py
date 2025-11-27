from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter()

@router.get("/contracts/{contract_id}/logs", response_model=List[schemas.OperationLog])
def get_contract_logs(contract_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.OperationLog).filter(models.OperationLog.contract_id == contract_id).order_by(models.OperationLog.created_at.desc()).all()
    return logs
