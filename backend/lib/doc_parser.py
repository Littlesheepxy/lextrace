import docx
import re
from typing import List, Dict

def extract_clauses(file_path: str) -> List[Dict[str, str]]:
    """
    Extracts clauses from a .docx file.
    Returns a list of dicts: {'id': '1.1', 'text': 'Clause text...'}
    """
    doc = docx.Document(file_path)
    clauses = []
    current_clause_id = None
    current_clause_text = []

    # Simple regex for clause numbering (e.g., "1.", "1.1", "Article 1")
    # This is a heuristic and might need adjustment for specific contract formats.
    # Regex for various numbering formats:
    # 1. | 1.1 | 1.1.1
    # Article 1 | Section 1
    # (a) | (1) - maybe too aggressive, let's stick to major headings first
    clause_pattern = re.compile(r'^(?:Article|Section)?\s*(\d+(?:\.\d+)*)\.?\s+(.*)', re.IGNORECASE)
    
    para_index = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        para_index += 1
        match = clause_pattern.match(text)
        
        if match:
            # Save previous clause if exists
            if current_clause_id:
                clauses.append({
                    "id": current_clause_id,
                    "text": "\n".join(current_clause_text).strip()
                })
            
            # Start new clause
            # Group 1 is the number (e.g. "1" or "1.1"), Group 2 is the rest
            current_clause_id = match.group(1)
            current_clause_text = [match.group(2)]
        else:
            # Append to current clause or treat as general text if no clause started
            if current_clause_id:
                current_clause_text.append(text)
            else:
                # Handle preamble or unnumbered text
                # Use a special ID for preamble/unnumbered paragraphs
                clauses.append({
                    "id": f"para_{para_index}",
                    "text": text
                })

    # Append the last clause
    if current_clause_id:
        clauses.append({
            "id": current_clause_id,
            "text": "\n".join(current_clause_text).strip()
        })
    
    return clauses
