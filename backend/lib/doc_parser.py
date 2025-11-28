import docx
import re
from typing import List, Dict, Optional, Any

def get_clean_text_and_indent(para) -> str:
    """
    Extracts text from a paragraph, ignoring runs with strikethrough.
    Also returns indentation level (approximate).
    """
    text = ""
    for run in para.runs:
        if not run.font.strike:
            text += run.text
            
    # Calculate indentation (approximate levels)
    # 1 level approx 24pt or 0.33 inches? 
    # Let's just store the raw value or a simplified level (0, 1, 2)
    indent = 0
    if para.paragraph_format.left_indent:
        # left_indent is an Emu object, convert to points approx
        # 1 inch = 914400 EMU, 1 pt = 12700 EMU
        pts = para.paragraph_format.left_indent.pt
        if pts:
            indent = int(pts // 18) # Assume ~18pt per level?
            
    return text.strip(), indent

def extract_clauses(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts clauses from a .docx file into structured objects.
    Returns: [{'id': '...', 'number': '...', 'title': '...', 'body': '...', 'text': '...', 'indent': 0}]
    """
    doc = docx.Document(file_path)
    clauses = []
    
    # Current clause state
    curr_number = None
    curr_title = None
    curr_body_lines = []
    curr_indent = 0
    
    # Regex for clause numbering
    # Supports:
    # 1. 第1条 | 第一条 | 第 1 条
    # 2. 1. | 1.1 | 1.1.1
    # 3. 1、
    # 4. Article 1 | Section 1
    # 5. (1) | （一） | (a)
    clause_pattern = re.compile(
        r'^\s*(?:'
        r'(?:Article|Section)\s*\d+(?:\.\d+)*|'  # English Article/Section
        r'第\s*[0-9一二三四五六七八九十百]+\s*条|'  # Chinese 第x条
        r'\d+(?:\.\d+)*\.?|'                      # 1. or 1.1 or 1.1.1
        r'\d+、|'                                 # 1、
        r'[（(][0-9一二三四五六七八九十a-z]+[）)]' # (1) or （一） or (a)
        r')\s*',
        re.IGNORECASE
    )

    para_index = 0

    def flush_clause():
        nonlocal curr_number, curr_title, curr_body_lines, curr_indent
        if curr_number or curr_body_lines:
            # If no number, treat as a "paragraph" clause
            c_id = curr_number if curr_number else f"para_{para_index}"
            
            # Construct full text for fallback/display
            full_text = ""
            if curr_number:
                full_text += curr_number + " "
            if curr_title:
                full_text += curr_title + "\n"
            full_text += "\n".join(curr_body_lines)
            
            clauses.append({
                "id": c_id, 
                "number": curr_number,
                "title": curr_title,
                "body": "\n".join(curr_body_lines).strip(),
                "text": full_text.strip(),
                "indent": curr_indent
            })
            
        # Reset
        curr_number = None
        curr_title = None
        curr_body_lines = []
        curr_indent = 0

    for para in doc.paragraphs:
        # Get clean text (no strikethrough) and indent
        text, indent = get_clean_text_and_indent(para)
        
        if not text:
            continue
            
        match = clause_pattern.match(text)
        
        if match:
            # We found a new numbered clause start
            flush_clause()
            
            para_index += 1
            
            # Extract number and the rest of the line
            full_match = match.group(0) # The number part including whitespace
            rest_of_line = text[len(full_match):].strip()
            
            curr_number = full_match.strip()
            curr_indent = indent
            
            # Heuristic: Is the rest of the line a Title or Body?
            if len(rest_of_line) < 40 and not rest_of_line.endswith(('。', '.', ':', '：', ';', '；')):
                curr_title = rest_of_line
            else:
                if rest_of_line:
                    curr_body_lines.append(rest_of_line)
        else:
            # Not a numbered line
            if curr_number:
                # Belongs to current clause body
                curr_body_lines.append(text)
            else:
                # Unnumbered paragraph (preamble, etc.)
                para_index += 1
                clauses.append({
                    "id": f"para_{para_index}",
                    "number": None,
                    "title": None,
                    "body": text,
                    "text": text,
                    "indent": indent
                })

    flush_clause()
    
    return clauses
