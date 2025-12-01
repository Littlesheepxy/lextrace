import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
import re
from typing import List, Dict, Optional, Any, Tuple

def get_paragraph_info(para) -> Tuple[str, int, bool, bool]:
    """
    Extracts text and formatting info from a paragraph.
    Returns: (text, indent_level, is_centered, is_bold)
    """
    text = ""
    is_bold = False
    bold_count = 0
    total_runs = 0
    
    for run in para.runs:
        if not run.font.strike:
            text += run.text
            total_runs += 1
            if run.bold:
                bold_count += 1
    
    # If majority of runs are bold, consider the paragraph bold
    if total_runs > 0 and bold_count / total_runs > 0.5:
        is_bold = True
            
    # Calculate indentation level
    indent = 0
    if para.paragraph_format.left_indent:
        pts = para.paragraph_format.left_indent.pt
        if pts:
            indent = int(pts // 18)
    
    # Check if centered
    is_centered = para.alignment == WD_ALIGN_PARAGRAPH.CENTER
            
    return text.strip(), indent, is_centered, is_bold

def extract_clauses(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts clauses from a .docx file into structured objects.
    Returns: [{'id': '...', 'number': '...', 'title': '...', 'body': '...', 'text': '...', 'indent': 0, 'level': 1}]
    """
    doc = docx.Document(file_path)
    clauses = []
    
    # Current clause state
    curr_number = None
    curr_title = None
    curr_body_lines = []
    curr_indent = 0
    curr_level = 1
    
    # Chinese number mapping
    CN_NUMBERS = '零一二三四五六七八九十百千万'
    
    # Regex patterns for different clause numbering formats
    # Order matters - more specific patterns should come first
    patterns = [
        # 第一章 / 第1章 / 第 一 章 (Level 1 - Chapter)
        (re.compile(r'^第\s*([0-9一二三四五六七八九十百]+)\s*章'), 'chapter', 1),
        # 第一条 / 第1条 / 第 一 条 (Level 1 - Article)
        (re.compile(r'^第\s*([0-9一二三四五六七八九十百]+)\s*条'), 'article', 1),
        # 第一节 / 第1节 (Level 2 - Section)
        (re.compile(r'^第\s*([0-9一二三四五六七八九十百]+)\s*节'), 'section', 2),
        # ARTICLE 1 / Article 1 / SECTION 1 / Section 1 (English)
        (re.compile(r'^(?:ARTICLE|Article|SECTION|Section)\s+(\d+(?:\.\d+)*)', re.IGNORECASE), 'en_article', 1),
        # 一、/ 二、/ 三、 (Chinese number + 、) - Level 2
        (re.compile(r'^([一二三四五六七八九十]+)、'), 'cn_bullet', 2),
        # A. / B. / C. (大写字母+点+空格/Tab) - Level 2
        (re.compile(r'^([A-Z])\.[\s\t]+'), 'alpha_dot', 2),
        # A<tab> / B<tab> (大写字母+Tab) - Level 2
        (re.compile(r'^([A-Z])\t'), 'alpha_tab', 2),
        # 1.1.1 / 1.2.3 (三级编号) - Level 3 - MUST come before 1.1
        (re.compile(r'^(\d+\.\d+\.\d+)\.?\s*'), 'num_three', 3),
        # 1.1 / 1.2 / 2.1 (两级编号) - Level 2
        (re.compile(r'^(\d+\.\d+)\.?\s*'), 'num_two', 2),
        # 1. / 2. / 3. (单独的数字+点+空格/Tab) - Level 1 for main sections
        (re.compile(r'^(\d+)\.[\s\t]+'), 'num_dot', 1),
        # 1、/ 2、/ 3、 (数字+顿号) - Level 2
        (re.compile(r'^(\d+)、'), 'num_bullet', 2),
        # （一）/ （二）/ (1) / (2) - Level 3
        (re.compile(r'^[（(]([0-9一二三四五六七八九十]+)[）)]\s*'), 'paren_num', 3),
        # (a) / (b) / (i) / (ii) / (A) / (B) - Level 3
        (re.compile(r'^[（(]([a-zA-Z]+|[ivxIVX]+)[）)]\s*'), 'paren_alpha', 3),
    ]
    
    # Track potential section headers (title on one line, number on next)
    pending_header = None
    
    para_index = 0
    
    # Track parent clause info for building hierarchical IDs
    current_parent_info = [("", ""), ("", ""), ("", "")]  # [(num, title_hash), ...] for levels 1-3
    
    def generate_stable_id(number: Optional[str], title: Optional[str], index: int, level: int = 0) -> str:
        """
        Generate a stable ID based on TITLE (primary) + number (secondary).
        
        This handles the case where a new clause is inserted and existing clauses
        get renumbered. The ID is based on the title hash, so even if "1.2 Board Composition"
        becomes "1.3 Board Composition", it will still have the same ID.
        """
        nonlocal current_parent_info
        import hashlib
        
        # Generate title hash for stability across renumbering
        title_hash = ""
        if title:
            # Normalize title: remove common variations
            normalized_title = title.strip().lower()
            # Remove trailing punctuation that might vary
            normalized_title = normalized_title.rstrip('.:：。')
            title_hash = hashlib.md5(normalized_title.encode()).hexdigest()[:6]
        
        if number:
            # Clean up number for display/fallback
            clean_num = number.replace('.', '_').replace('(', '').replace(')', '').replace('、', '_')
            clean_num = clean_num.replace('第', '').replace('章', 'z').replace('条', 't').replace('节', 'j')
            clean_num = clean_num.replace('（', '').replace('）', '')
            clean_num = clean_num.strip('_ ')
            
            if not clean_num:
                if title_hash:
                    return f"title_{title_hash}"
                return f"para_{index}"
            
            # Build ID using TITLE HASH as primary identifier
            # This ensures that renumbered clauses keep the same ID
            if title_hash:
                # Use title hash for stability, with parent context for uniqueness
                if level == 3 and current_parent_info[1][1]:
                    # Level 3: include parent L2 title hash for context
                    # e.g., clause_<parent_L2_hash>_<title_hash>
                    parent_hash = current_parent_info[1][1]
                    return f"clause_{parent_hash}_{title_hash}"
                elif level == 2 and current_parent_info[0][1]:
                    # Level 2: include parent L1 title hash for context
                    current_parent_info[1] = (clean_num, title_hash)
                    parent_hash = current_parent_info[0][1]
                    return f"clause_{parent_hash}_{title_hash}"
                elif level == 1:
                    # Level 1: just use title hash
                    current_parent_info[0] = (clean_num, title_hash)
                    current_parent_info[1] = ("", "")
                    return f"clause_{title_hash}"
                else:
                    return f"clause_{title_hash}"
            else:
                # No title, fall back to number-based ID (less stable but necessary)
                # This is for clauses like "(a)" without a distinct title
                if level == 3 and current_parent_info[1][0]:
                    return f"clause_{current_parent_info[0][0]}_{current_parent_info[1][0]}_{clean_num}"
                elif level == 2 and current_parent_info[0][0]:
                    current_parent_info[1] = (clean_num, "")
                    return f"clause_{current_parent_info[0][0]}_{clean_num}"
                elif level == 1:
                    current_parent_info[0] = (clean_num, "")
                    current_parent_info[1] = ("", "")
                    return f"clause_{clean_num}"
                else:
                    return f"clause_{clean_num}"
        elif title_hash:
            return f"title_{title_hash}"
        else:
            return f"para_{index}"

    def flush_clause():
        nonlocal curr_number, curr_title, curr_body_lines, curr_indent, curr_level
        if curr_number or curr_body_lines:
            c_id = generate_stable_id(curr_number, curr_title, para_index, curr_level)
            
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
                "indent": curr_indent,
                "level": curr_level
            })
            
        # Reset
        curr_number = None
        curr_title = None
        curr_body_lines = []
        curr_indent = 0
        curr_level = 1

    def match_clause_pattern(text: str) -> Optional[Tuple[str, str, int]]:
        """Try to match text against clause patterns. Returns (number, rest_of_line, level) or None."""
        for pattern, ptype, level in patterns:
            match = pattern.match(text)
            if match:
                full_match_end = match.end()
                number_part = text[:full_match_end].strip()
                rest = text[full_match_end:].strip()
                return (number_part, rest, level)
        return None

    # Counters for auto-numbering Heading styles
    heading_counters = [0, 0, 0]  # [level1, level2, level3]
    last_heading_clause_id = None  # Track the last heading clause for appending body text
    
    for para in doc.paragraphs:
        text, indent, is_centered, is_bold = get_paragraph_info(para)
        
        if not text:
            continue
        
        # Check paragraph style for heading detection
        style_name = para.style.name if para.style else ""
        is_heading_style = style_name.lower().startswith('heading') or style_name.lower().startswith('title')
        
        # Extract heading level from style name (e.g., "Heading 1" -> 1, "Heading 2" -> 2)
        heading_level = 0
        if is_heading_style:
            import re as re_style
            level_match = re_style.search(r'(\d+)', style_name)
            if level_match:
                heading_level = min(int(level_match.group(1)), 3)  # Cap at 3 levels
            else:
                heading_level = 1  # Title style -> Level 1
        
        # Handle text that starts with "." - this is likely the body of the previous heading
        # Word auto-numbering leaves just "." or ".  text" when the number is auto-generated
        if text.startswith('.') and last_heading_clause_id:
            body_text = text[1:].strip()  # Remove the leading dot
            if body_text:
                # Find the last heading clause and append to its body
                for c in reversed(clauses):
                    if c.get('id') == last_heading_clause_id:
                        if c.get('body'):
                            c['body'] += '\n' + body_text
                        else:
                            c['body'] = body_text
                        c['text'] = (c.get('number', '') + ' ' + c.get('title', '') + '\n' + c['body']).strip()
                        break
            continue
        
        # Check for clause patterns
        match_result = match_clause_pattern(text)
        
        # Handle case where previous line was a potential section header
        # and current line starts with just a number/dot
        if pending_header and text.strip() in ['.', ':', '：']:
            # The previous header and this dot belong together
            flush_clause()
            para_index += 1
            clauses.append({
                "id": generate_stable_id(None, pending_header, para_index),
                "number": None,
                "title": pending_header,
                "body": "",
                "text": pending_header,
                "indent": 0,
                "level": 1,
                "is_header": True
            })
            pending_header = None
            continue
        
        # Clear pending header if we moved on
        if pending_header and match_result:
            # Previous was a header, current is numbered - save the header first
            flush_clause()
            para_index += 1
            clauses.append({
                "id": generate_stable_id(None, pending_header, para_index),
                "number": None,
                "title": pending_header,
                "body": "",
                "text": pending_header,
                "indent": 0,
                "level": 1,
                "is_header": True
            })
            pending_header = None
        
        if match_result:
            # Found a numbered clause
            flush_clause()
            para_index += 1
            
            number_part, rest_of_line, level = match_result
            curr_number = number_part
            curr_indent = indent
            curr_level = level
            
            # Determine if rest is title or body
            if len(rest_of_line) < 50 and not rest_of_line.endswith(('。', '.', '；', ';')):
                curr_title = rest_of_line
            else:
                if rest_of_line:
                    curr_body_lines.append(rest_of_line)
                    
        elif is_centered and is_bold and len(text) < 60:
            # Centered bold text - likely a section header
            flush_clause()
            para_index += 1
            
            clauses.append({
                "id": generate_stable_id(None, text, para_index),
                "number": None,
                "title": text,
                "body": "",
                "text": text,
                "indent": 0,
                "level": 1,
                "is_header": True
            })
            pending_header = None
            
        elif is_heading_style and heading_level > 0:
            # Word Heading style with explicit level
            flush_clause()
            para_index += 1
            
            # For deeper heading levels (4+), map to level 3
            mapped_level = min(heading_level, 3)
            
            # Auto-generate numbering based on heading level
            # Update counters: increment current level, reset deeper levels
            # Format: 1. -> 1.1 -> (a), (b), (c)... following legal document conventions
            if mapped_level == 1:
                heading_counters[0] += 1
                heading_counters[1] = 0
                heading_counters[2] = 0
                auto_number = f"{heading_counters[0]}."
            elif mapped_level == 2:
                heading_counters[1] += 1
                heading_counters[2] = 0
                auto_number = f"{heading_counters[0]}.{heading_counters[1]}"
            else:  # level 3 - use (a), (b), (c) format
                heading_counters[2] += 1
                # Convert number to letter: 1->a, 2->b, 3->c, etc.
                letter = chr(ord('a') + heading_counters[2] - 1) if heading_counters[2] <= 26 else str(heading_counters[2])
                auto_number = f"({letter})"
            
            clause_id = generate_stable_id(auto_number, text, para_index, mapped_level)
            clauses.append({
                "id": clause_id,
                "number": auto_number,
                "title": text,
                "body": "",
                "text": f"{auto_number} {text}",
                "indent": indent,
                "level": mapped_level,
                "is_header": True
            })
            last_heading_clause_id = clause_id
            pending_header = None
            
        elif is_bold and len(text) < 60 and not text.endswith(('。', '.', '；', ';', ':', '：')):
            # Bold short text - potential section header (without Heading style)
            if len(text) > 3:
                flush_clause()
                pending_header = text
        
        elif text.isupper() and len(text) < 50 and len(text.split()) <= 6 and not text.endswith((':', '：')):
            # All-caps short text - common section header in English contracts
            # e.g., "COMMON STOCK", "PREFERRED STOCK", "RECITALS"
            flush_clause()
            para_index += 1
            
            clauses.append({
                "id": generate_stable_id(None, text, para_index),
                "number": None,
                "title": text,
                "body": "",
                "text": text,
                "indent": 0,
                "level": 1,
                "is_header": True
            })
            pending_header = None
            
        elif is_centered and len(text) < 40:
            # Short centered text - might be a subtitle
            flush_clause()
            para_index += 1
            
            clauses.append({
                "id": generate_stable_id(None, text, para_index),
                "number": None,
                "title": text,
                "body": "",
                "text": text,
                "indent": 0,
                "level": 1,
                "is_header": True
            })
            pending_header = None
            
        else:
            # Regular paragraph
            # If we have a pending header and this is content, save the header first
            if pending_header:
                flush_clause()
                para_index += 1
                clauses.append({
                    "id": generate_stable_id(None, pending_header, para_index),
                    "number": None,
                    "title": pending_header,
                    "body": "",
                    "text": pending_header,
                    "indent": 0,
                    "level": 1,
                    "is_header": True
                })
                pending_header = None
            
            if curr_number:
                # Belongs to current clause body
                curr_body_lines.append(text)
            else:
                # Standalone paragraph
                # Skip very short paragraphs that are likely formatting artifacts
                if len(text) > 5:
                    para_index += 1
                    clauses.append({
                        "id": generate_stable_id(None, None, para_index),
                        "number": None,
                        "title": None,
                        "body": text,
                        "text": text,
                        "indent": indent,
                        "level": 0
                    })

    flush_clause()
    
    return clauses
