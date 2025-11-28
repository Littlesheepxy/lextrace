import difflib
from typing import List, Dict, Any, Tuple

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculates similarity between two strings (0.0 to 1.0).
    Uses max of case-sensitive and case-insensitive ratio to catch matches like "TO:" vs "To:".
    """
    if not text1 and not text2:
        return 1.0
    if not text1 or not text2:
        return 0.0
        
    # Case-sensitive ratio
    ratio_sensitive = difflib.SequenceMatcher(None, text1, text2).ratio()
    
    # Case-insensitive ratio
    ratio_insensitive = difflib.SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    # Token-based ratio (words)
    # This helps when large chunks are inserted/deleted but the "flow" of words is similar
    tokens1 = text1.split()
    tokens2 = text2.split()
    ratio_token = 0.0
    if tokens1 and tokens2:
        ratio_token = difflib.SequenceMatcher(None, tokens1, tokens2).ratio()
    
    return max(ratio_sensitive, ratio_insensitive, ratio_token)

def match_clauses(old_clauses: List[Dict], new_clauses: List[Dict]) -> List[Dict[str, Any]]:
    """
    Matches old clauses to new clauses based on similarity.
    Returns a list of diff items.
    """
    diffs = []
    
    # Pool of available old clauses (index -> clause)
    old_pool = {i: c for i, c in enumerate(old_clauses)}
    
    # Matched indices
    matched_old_indices = set()
    
    # Thresholds
    MATCH_THRESHOLD = 0.5  # Lowered to 0.5 to catch heavy edits (token-based score was ~0.58)
    CHANGE_THRESHOLD = 0.98 # Below this, consider it "modified"
    
    # 1. Iterate through NEW clauses and find best match in OLD pool
    for new_idx, new_c in enumerate(new_clauses):
        best_old_idx = -1
        best_score = 0.0
        
        for old_idx, old_c in old_pool.items():
            if old_idx in matched_old_indices:
                continue
                
            # Calculate weighted similarity
            # Body is more important (80%), Title (20%)
            sim_body = calculate_similarity(old_c['body'], new_c['body'])
            sim_title = calculate_similarity(old_c['title'], new_c['title'])
            
            # If bodies are empty, rely on title/number?
            # If both bodies empty, sim_body is 1.0
            
            score = 0.8 * sim_body + 0.2 * sim_title
            
            if score > best_score:
                best_score = score
                best_old_idx = old_idx
        
        if best_score >= MATCH_THRESHOLD:
            # Found a match!
            matched_old_indices.add(best_old_idx)
            old_c = old_pool[best_old_idx]
            
            # Determine Change Type
            change_type = "unchanged"
            
            # Check for modifications
            # STRICT CHECK: If text is not identical, it IS modified, regardless of score
            if old_c['text'] != new_c['text']:
                 change_type = "modified"
            
            # Refine change type if it's just renumbering or renaming
            if change_type == "modified":
                # If content is identical but number changed
                if old_c['body'] == new_c['body'] and old_c['title'] == new_c['title'] and old_c['number'] != new_c['number']:
                    change_type = "renumbered"
                # If content is identical but title changed
                elif old_c['body'] == new_c['body'] and old_c['number'] == new_c['number'] and old_c['title'] != new_c['title']:
                    change_type = "renamed"
                # If both changed but body identical
                elif old_c['body'] == new_c['body']:
                    change_type = "renumbered_and_renamed"
                
            # If score is low but we matched, it's definitely modified (already handled by strict check)

            diffs.append({
                "clause_id": new_c['id'], # Use new ID
                "type": "modified" if change_type != "unchanged" else "unchanged", # Frontend expects 'modified', 'added', 'deleted', 'unchanged'
                "change_type": change_type, # Sub-type for UI
                "original": old_c['text'],
                "modified": new_c['text'],
                "similarity": best_score,
                "old_number": old_c['number'],
                "new_number": new_c['number'],
                "old_title": old_c['title'],
                "new_title": new_c['title'],
                "indent": new_c.get('indent', 0)
            })
        else:
            # No match found -> Added
            diffs.append({
                "clause_id": new_c['id'],
                "type": "added",
                "change_type": "added",
                "original": None,
                "modified": new_c['text'],
                "similarity": 0.0,
                "indent": new_c.get('indent', 0)
            })
            
    # 2. Remaining OLD clauses are Deleted
    for old_idx, old_c in old_pool.items():
        if old_idx not in matched_old_indices:
            diffs.append({
                "clause_id": old_c['id'],
                "type": "deleted",
                "change_type": "deleted",
                "original": old_c['text'],
                "modified": None,
                "similarity": 0.0,
                "indent": old_c.get('indent', 0)
            })
            
    return diffs
