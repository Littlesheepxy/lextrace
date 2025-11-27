from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ContractBase(BaseModel):
    name: str

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

class DiffResponse(BaseModel):
    id: int
    content: str # JSON
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
