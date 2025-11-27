from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    versions = relationship("Version", back_populates="contract")

    @property
    def version_count(self):
        return len(self.versions)

class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    version_number = Column(Integer)
    file_path = Column(String)
    file_path = Column(String)
    commit_message = Column(String)
    html_content = Column(Text) # High-fidelity HTML from mammoth
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="versions")
    diffs = relationship("Diff", back_populates="version", foreign_keys="Diff.version_id")

class Diff(Base):
    __tablename__ = "diffs"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("versions.id"))
    previous_version_id = Column(Integer, ForeignKey("versions.id"), nullable=True)
    content = Column(Text) # JSON string for clause-level diffs
    summary = Column(Text) # AI summary

    version = relationship("Version", back_populates="diffs", foreign_keys=[version_id])

class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    action = Column(String) # e.g., "create_contract", "upload_version", "delete_version"
    details = Column(String) # JSON or text details
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="logs")

# Update Contract relationship
Contract.logs = relationship("OperationLog", back_populates="contract", cascade="all, delete-orphan")
