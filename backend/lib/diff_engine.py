from typing import List, Dict, Any
from .doc_parser import extract_clauses
import difflib

def compare_versions(old_file_path: str, new_file_path: str) -> List[Dict[str, Any]]:
    """
    Compares two .docx files and returns clause-level diffs.
    """
    # Separate named clauses (stable IDs) from sequential paragraphs (unstable IDs)
    old_named = {}
    old_paras = []
    for c in extract_clauses(old_file_path):
        if c['id'].startswith('para_'):
            old_paras.append(c['text'])
        else:
            old_named[c['id']] = c['text']

    new_named = {}
    new_paras = []
    for c in extract_clauses(new_file_path):
        if c['id'].startswith('para_'):
            new_paras.append(c['text'])
        else:
            new_named[c['id']] = c['text']

    diffs = []

    # 1. Compare Named Clauses (ID-based)
    all_named_ids = sorted(set(old_named.keys()) | set(new_named.keys()), key=lambda x: [int(p) for p in x.split('.') if p.isdigit()] if x.replace('.','').isdigit() else [0])
    
    # Better sort for named IDs (reuse logic if needed, or keep simple)
    # For now, let's just iterate.
    
    for clause_id in all_named_ids:
        old_text = old_named.get(clause_id)
        new_text = new_named.get(clause_id)

        if old_text and not new_text:
            diffs.append({"clause_id": clause_id, "type": "deleted", "original": old_text, "modified": None, "risk": "medium"})
        elif not old_text and new_text:
            diffs.append({"clause_id": clause_id, "type": "added", "original": None, "modified": new_text, "risk": "low"})
        elif old_text != new_text:
            diffs.append({"clause_id": clause_id, "type": "modified", "original": old_text, "modified": new_text, "risk": "low"})
        else:
            # Unchanged
            diffs.append({"clause_id": clause_id, "type": "unchanged", "original": old_text, "modified": new_text, "risk": "low"})

    # 2. Compare Paragraphs (Sequence-based)
    matcher = difflib.SequenceMatcher(None, old_paras, new_paras)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                diffs.append({
                    "clause_id": f"para_{j1 + k + 1}",
                    "type": "unchanged",
                    "original": old_paras[i1 + k],
                    "modified": new_paras[j1 + k],
                    "risk": "low"
                })
        elif tag == 'replace':
            # Modified
            for k in range(i2 - i1):
                old_idx = i1 + k
                new_idx = j1 + k
                if new_idx < j2:
                    diffs.append({
                        "clause_id": f"para_{new_idx+1}", # Use new index for ID
                        "type": "modified",
                        "original": old_paras[old_idx],
                        "modified": new_paras[new_idx],
                        "risk": "low"
                    })
                else:
                    # Extra old paras are deleted
                    diffs.append({
                        "clause_id": f"para_old_{old_idx+1}",
                        "type": "deleted",
                        "original": old_paras[old_idx],
                        "modified": None,
                        "risk": "medium"
                    })
            # Extra new paras are added
            if (j2 - j1) > (i2 - i1):
                for k in range((j2 - j1) - (i2 - i1)):
                    new_idx = j1 + (i2 - i1) + k
                    diffs.append({
                        "clause_id": f"para_{new_idx+1}",
                        "type": "added",
                        "original": None,
                        "modified": new_paras[new_idx],
                        "risk": "low"
                    })

        elif tag == 'delete':
            for k in range(i1, i2):
                diffs.append({
                    "clause_id": f"para_old_{k+1}",
                    "type": "deleted",
                    "original": old_paras[k],
                    "modified": None,
                    "risk": "medium"
                })
        elif tag == 'insert':
            for k in range(j1, j2):
                diffs.append({
                    "clause_id": f"para_{k+1}",
                    "type": "added",
                    "original": None,
                    "modified": new_paras[k],
                    "risk": "low"
                })

    return diffs
