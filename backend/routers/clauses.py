from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from .. import models, database
from ..lib.doc_parser import extract_clauses
from ..lib.smart_diff import calculate_similarity
from ..lib.ai_engine import analyze_clause_evolution
import json

router = APIRouter(
    prefix="/contracts/{contract_id}/clauses",
    tags=["clauses"],
)

def build_clause_tree(clauses: List[Dict], all_version_changes: Dict[str, Dict]) -> List[Dict]:
    """
    Build a hierarchical clause tree from flat clause list.
    Uses the 'level' field from clause extraction.
    """
    tree = []
    stack = []  # Stack of (node, level)
    
    for clause in clauses:
        clause_id = clause['id']
        number = clause.get('number', '')
        title = clause.get('title', '')
        
        # Use the level from extraction, default to 1
        level = clause.get('level', 1)
        
        # Skip level 0 paragraphs (standalone text without structure)
        if level == 0 and not number and not title:
            continue
        
        # Get change info from all versions
        change_info = all_version_changes.get(clause_id, {})
        has_changes = change_info.get('has_changes', False)
        change_type = change_info.get('change_type', 'unchanged')
        risk_level = change_info.get('risk_level', 'none')
        version_count = change_info.get('version_count', 1)
        
        # Build display number/title
        display_number = number if number else ""
        display_title = title if title else ""
        
        # For headers without numbers, use title as the "number" display
        if not display_number and display_title:
            display_number = display_title
            display_title = ""
        
        node = {
            "id": clause_id,
            "number": display_number or f"段落",
            "title": display_title,
            "level": max(level, 1),  # Ensure at least level 1
            "hasChanges": has_changes,
            "changeType": change_type,
            "riskLevel": risk_level,
            "versionCount": version_count,
            "children": []
        }
        
        # Find parent based on level
        while stack and stack[-1][1] >= level:
            stack.pop()
        
        if stack:
            stack[-1][0]["children"].append(node)
        else:
            tree.append(node)
        
        stack.append((node, level))
    
    return tree


def analyze_clause_changes(contract_id: int, db: Session) -> Dict[str, Dict]:
    """
    Analyze all versions to determine clause change information.
    Returns: {clause_id: {has_changes, change_type, risk_level, version_count}}
    """
    versions = db.query(models.Version).filter(
        models.Version.contract_id == contract_id
    ).order_by(models.Version.version_number).all()
    
    if not versions:
        return {}
    
    clause_info = {}
    prev_clauses_map = {}
    
    for i, version in enumerate(versions):
        if not version.file_path:
            continue
            
        try:
            clauses = extract_clauses(version.file_path)
        except Exception as e:
            print(f"Error extracting clauses from version {version.id}: {e}")
            continue
        
        current_clauses_map = {c['id']: c for c in clauses}
        
        for clause_id, clause in current_clauses_map.items():
            if clause_id not in clause_info:
                clause_info[clause_id] = {
                    'has_changes': False,
                    'change_type': 'unchanged',
                    'risk_level': 'none',
                    'version_count': 0,
                    'first_version': version.version_number,
                    'last_modified_version': None,
                }
            
            info = clause_info[clause_id]
            info['version_count'] += 1
            
            # Check for changes from previous version
            if i > 0 and prev_clauses_map:
                prev_clause = prev_clauses_map.get(clause_id)
                
                if prev_clause is None:
                    # Clause was added in this version
                    info['has_changes'] = True
                    info['change_type'] = 'added'
                    info['last_modified_version'] = version.version_number
                    # Mark first version as current (it didn't exist before)
                    info['first_version'] = version.version_number
                elif prev_clause['text'] != clause['text']:
                    # Clause was modified
                    info['has_changes'] = True
                    if info['change_type'] == 'unchanged':
                        info['change_type'] = 'modified'
                    info['last_modified_version'] = version.version_number
                    
                    # Risk level: temporarily disabled, will be handled by AI later
                    # info['risk_level'] remains 'none'
        
        # Check for deleted clauses
        if i > 0 and prev_clauses_map:
            for prev_id in prev_clauses_map:
                if prev_id not in current_clauses_map:
                    if prev_id not in clause_info:
                        clause_info[prev_id] = {
                            'has_changes': True,
                            'change_type': 'deleted',
                            'risk_level': 'none',  # Risk level disabled, will use AI later
                            'version_count': i,
                            'first_version': 1,
                            'last_modified_version': version.version_number,
                        }
                    else:
                        clause_info[prev_id]['has_changes'] = True
                        clause_info[prev_id]['change_type'] = 'deleted'
                        clause_info[prev_id]['last_modified_version'] = version.version_number
        
        prev_clauses_map = current_clauses_map
    
    return clause_info


@router.get("/tree")
def get_clause_tree(contract_id: int, db: Session = Depends(database.get_db)):
    """
    Get the clause tree for a contract based on the latest version.
    """
    # Get latest version
    latest_version = db.query(models.Version).filter(
        models.Version.contract_id == contract_id
    ).order_by(models.Version.version_number.desc()).first()
    
    if not latest_version:
        return []
    
    # Extract clauses from latest version
    try:
        clauses = extract_clauses(latest_version.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract clauses: {str(e)}")
    
    # Analyze changes across all versions
    change_info = analyze_clause_changes(contract_id, db)
    
    # Build tree
    tree = build_clause_tree(clauses, change_info)
    
    return tree


@router.get("/{clause_id}/history")
def get_clause_history(
    contract_id: int, 
    clause_id: str, 
    from_version: Optional[int] = None,
    to_version: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """
    Get the history of a specific clause across all versions.
    """
    # Get all versions
    query = db.query(models.Version).filter(
        models.Version.contract_id == contract_id
    )
    
    if from_version:
        query = query.filter(models.Version.version_number >= from_version)
    if to_version:
        query = query.filter(models.Version.version_number <= to_version)
    
    versions = query.order_by(models.Version.version_number).all()
    
    if not versions:
        raise HTTPException(status_code=404, detail="No versions found")
    
    version_states = []
    prev_content = None
    clause_path = []
    
    for i, version in enumerate(versions):
        try:
            clauses = extract_clauses(version.file_path)
        except Exception as e:
            print(f"Error extracting clauses: {e}")
            continue
        
        # Find matching clause by ID or similar content
        matching_clause = None
        for c in clauses:
            if c['id'] == clause_id:
                matching_clause = c
                break
        
        # If not found by ID, try fuzzy match
        if not matching_clause and prev_content:
            best_match = None
            best_score = 0
            for c in clauses:
                score = calculate_similarity(prev_content, c['text'])
                if score > best_score and score > 0.5:
                    best_score = score
                    best_match = c
            if best_match:
                matching_clause = best_match
        
        # Determine status and change info
        if matching_clause:
            content = matching_clause['text']
            preview = content[:100] + ('...' if len(content) > 100 else '')
            
            # Build clause path
            if not clause_path:
                parts = []
                if matching_clause.get('number'):
                    parts.append(matching_clause['number'])
                if matching_clause.get('title'):
                    parts.append(matching_clause['title'])
                clause_path = [' '.join(parts)] if parts else [f"条款 {clause_id}"]
            
            # Determine change from previous
            change_from_prev = None
            if i > 0:
                if prev_content is None:
                    change_from_prev = {
                        "type": "added",
                        "summary": "本版本新增此条款"
                    }
                elif content != prev_content:
                    # Generate change summary
                    similarity = calculate_similarity(prev_content, content)
                    if similarity > 0.95:
                        summary = "细微调整"
                    elif similarity > 0.8:
                        summary = "部分内容修改"
                    else:
                        summary = "重大内容变更"
                    
                    # Try to detect specific changes
                    if len(content) > len(prev_content) * 1.5:
                        summary = "新增大量内容"
                    elif len(content) < len(prev_content) * 0.7:
                        summary = "删减部分内容"
                    
                    change_from_prev = {
                        "type": "modified",
                        "summary": summary
                    }
                else:
                    change_from_prev = {
                        "type": "unchanged",
                        "summary": "无变化"
                    }
            
            version_states.append({
                "versionId": version.id,
                "versionNumber": version.version_number,
                "createdAt": version.created_at.isoformat(),
                "status": "exists",
                "content": content,
                "preview": preview,
                "changeFromPrev": change_from_prev
            })
            
            prev_content = content
        else:
            # Clause doesn't exist in this version
            change_from_prev = None
            if i > 0 and prev_content:
                change_from_prev = {
                    "type": "deleted",
                    "summary": "本版本删除此条款"
                }
            
            version_states.append({
                "versionId": version.id,
                "versionNumber": version.version_number,
                "createdAt": version.created_at.isoformat(),
                "status": "not_exists",
                "content": None,
                "preview": "（本版本不包含此条款）",
                "changeFromPrev": change_from_prev
            })
            
            prev_content = None
    
    # Generate AI summary based on version changes
    ai_summary = None
    
    if version_states:
        # 准备 AI 分析所需的数据
        version_changes_for_ai = [
            {
                "versionNumber": vs["versionNumber"],
                "content": vs["content"],
                "changeFromPrev": vs.get("changeFromPrev")
            }
            for vs in version_states
        ]
        
        # 调用 AI 分析条款演变
        ai_summary = analyze_clause_evolution(
            clause_id=clause_id,
            clause_path=clause_path,
            version_changes=version_changes_for_ai
        )
    
    return {
        "clauseId": clause_id,
        "clausePath": clause_path,
        "versionStates": version_states,
        "aiSummary": ai_summary
    }

