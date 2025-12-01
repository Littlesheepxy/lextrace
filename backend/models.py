from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contracts = relationship("Contract", back_populates="project", cascade="all, delete-orphan")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="contracts")
    versions = relationship("Version", back_populates="contract", cascade="all, delete-orphan")

    @property
    def version_count(self):
        return len(self.versions)

class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    version_number = Column(Integer)
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

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    version_id = Column(Integer, ForeignKey("versions.id"))
    element_id = Column(String) # ID of the diff chunk or clause
    quote = Column(String, nullable=True) # Selected text context
    content = Column(String) # The remark text
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="comments")
    version = relationship("Version", back_populates="comments")

# Update Contract relationship
Contract.logs = relationship("OperationLog", back_populates="contract", cascade="all, delete-orphan")
Contract.comments = relationship("Comment", back_populates="contract", cascade="all, delete-orphan")
Version.comments = relationship("Comment", back_populates="version", cascade="all, delete-orphan")
