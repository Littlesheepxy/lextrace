from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas, database
from ..database import get_db # Assuming get_db is imported directly for the new endpoints

router = APIRouter(
    prefix="/contracts",
    tags=["contracts"],
)

@router.post("/", response_model=schemas.Contract)
def create_contract(contract: schemas.ContractCreate, db: Session = Depends(database.get_db)):
    db_contract = models.Contract(name=contract.name)
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)

    # Log creation
    log = models.OperationLog(
        contract_id=db_contract.id,
        action="create_contract",
        details=f"Created contract: {contract.name}"
    )
    db.add(log)
    db.commit()

    return db_contract

@router.get("/", response_model=List[schemas.Contract])
def read_contracts(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    contracts = db.query(models.Contract).options(joinedload(models.Contract.versions)).offset(skip).limit(limit).all()
    for c in contracts:
        print(f"DEBUG API: Contract {c.id} versions: {len(c.versions)} count_prop: {c.version_count}")
    return contracts

@router.get("/{contract_id}", response_model=schemas.Contract)
def read_contract(contract_id: int, db: Session = Depends(database.get_db)):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.delete("/{contract_id}", status_code=204)
def delete_contract(contract_id: int, db: Session = Depends(database.get_db)):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Cascade delete is handled by database foreign keys usually, 
    # but for SQLite we might need to ensure it or handle manually if not set.
    # SQLAlchemy relationship with cascade="all, delete" should handle it.
    db.delete(contract)
    db.commit()
    return None

