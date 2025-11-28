from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from datetime import datetime, timezone

router = APIRouter(
    prefix="/contracts/{contract_id}/versions/{version_id}/comments",
    tags=["comments"],
)

@router.post("/", response_model=schemas.Comment)
def create_comment(
    contract_id: int,
    version_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(database.get_db)
):
    # Verify contract and version exist
    version = db.query(models.Version).filter(
        models.Version.id == version_id,
        models.Version.contract_id == contract_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    db_comment = models.Comment(
        contract_id=contract_id,
        version_id=version_id,
        element_id=comment.element_id,
        quote=comment.quote,
        content=comment.content,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return db_comment

@router.get("/", response_model=List[schemas.Comment])
def read_comments(
    contract_id: int,
    version_id: int,
    db: Session = Depends(database.get_db)
):
    comments = db.query(models.Comment).filter(
        models.Comment.contract_id == contract_id,
        models.Comment.version_id == version_id
    ).order_by(models.Comment.created_at.desc()).all()
    
    return comments

@router.delete("/{comment_id}", status_code=204)
def delete_comment(
    contract_id: int,
    version_id: int,
    comment_id: int,
    db: Session = Depends(database.get_db)
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.contract_id == contract_id,
        models.Comment.version_id == version_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    db.delete(comment)
    db.commit()
    
    return None
