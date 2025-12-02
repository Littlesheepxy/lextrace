from typing import List, Dict, Any
from lib.doc_parser import extract_clauses
from lib.smart_diff import match_clauses

def compare_versions(old_file_path: str, new_file_path: str) -> List[Dict[str, Any]]:
    """
    Compares two .docx files using smart clause matching.
    """
    # 1. Extract structured clauses
    old_clauses = extract_clauses(old_file_path)
    new_clauses = extract_clauses(new_file_path)

    # 2. Match clauses using smart algorithm
    diffs = match_clauses(old_clauses, new_clauses)

    # 3. Sort diffs? 
    # Ideally we want them in the order of the NEW document for "added/modified/unchanged"
    # and maybe append "deleted" at the end or try to interleave them?
    # For now, let's sort by appearance in New document (which they mostly are from the loop)
    # Deleted ones are appended at the end.
    
    # To improve "Deleted" positioning, we could try to see where they were in OLD and map to NEW?
    # But for a simple list view, appending is okay. 
    # For "Side-by-Side", the frontend handles alignment.
    
    return diffs
