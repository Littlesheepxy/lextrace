from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import projects, contracts, versions, diffs, logs, comments, clauses

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LexTrace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(contracts.router)
app.include_router(versions.router)
app.include_router(diffs.router)
app.include_router(logs.router)
app.include_router(comments.router)
app.include_router(clauses.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to LexTrace API"}

@app.get("/health")
def health_check():
    """健康检查端点，用于 Docker 健康检查"""
    return {"status": "healthy", "service": "lawtrace-backend"}
