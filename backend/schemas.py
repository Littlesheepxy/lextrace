from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ContractBase(BaseModel):
    name: str
    project_id: int

class ContractCreate(ContractBase):
    pass

class Contract(ContractBase):
    id: int
    created_at: datetime
    version_count: int = 0
    
    class Config:
        from_attributes = True

class VersionBase(BaseModel):
    commit_message: str

class VersionCreate(VersionBase):
    pass

class Version(VersionBase):
    id: int
    contract_id: int
    version_number: int
    created_at: datetime
    created_at: datetime
    file_path: str
    html_content: Optional[str] = None
    
    class Config:
        from_attributes = True

class DiffItem(BaseModel):
    clause_id: str
    type: str # 'added', 'deleted', 'modified', 'unchanged'
    change_type: str # 'renumbered', 'renamed', 'modified', 'moved', 'unchanged', 'added', 'deleted'
    original: Optional[str]
    modified: Optional[str]
    similarity: float
    old_number: Optional[str] = None
    new_number: Optional[str] = None
    old_title: Optional[str] = None
    new_title: Optional[str] = None
    indent: int = 0

class DiffResponse(BaseModel):
    id: int
    content: str # JSON string of List[DiffItem]
    summary: str
    
    class Config:
        from_attributes = True

class AnalysisResponse(BaseModel):
    summary: str
    risk_assessments: dict
    
    class Config:
        from_attributes = True

class OperationLog(BaseModel):
    id: int
    contract_id: int
    action: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True

class BatchCommitFile(BaseModel):
    file_id: str
    original_filename: str
    detected_date: Optional[str] = None
    commit_message: Optional[str] = None

class CommentBase(BaseModel):
    element_id: str
    quote: Optional[str] = None
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    contract_id: int
    version_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
