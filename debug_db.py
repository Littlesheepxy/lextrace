from backend.database import SessionLocal
from backend.models import Contract, Version

db = SessionLocal()
contracts = db.query(Contract).all()

print(f"Found {len(contracts)} contracts")
for c in contracts:
    print(f"Contract: {c.id} - {c.name}")
    print(f"  Versions count (DB relationship): {len(c.versions)}")
    print(f"  Versions: {[v.version_number for v in c.versions]}")
    print(f"  Property version_count: {c.version_count}")

db.close()
