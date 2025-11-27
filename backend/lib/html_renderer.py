import docx
from docx.document import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import _Cell, Table
from docx.text.paragraph import Paragraph
import re
import html

def render_document_to_html(file_path: str) -> str:
    """
    Converts a DOCX file to HTML, preserving tables and basic formatting.
    Injects data-clause-id attributes for diff highlighting.
    """
    doc = docx.Document(file_path)
    html_output = []
    
    # Regex for clause numbering (same as doc_parser.py)
    clause_pattern = re.compile(r'^(?:Article|Section)?\s*(\d+(?:\.\d+)*)\.?\s+(.*)', re.IGNORECASE)
    
    current_clause_id = None
    para_index = 0
    
    # Iterate through body elements in order
    for element in doc.element.body:
        if isinstance(element, CT_P):
            para = Paragraph(element, doc)
            html_chunk, current_clause_id, para_index = render_paragraph(para, clause_pattern, current_clause_id, para_index)
            html_output.append(html_chunk)
        elif isinstance(element, CT_Tbl):
            table = Table(element, doc)
            html_chunk = render_table(table)
            # Tables don't get clause IDs for now, or maybe attach to previous?
            # Let's wrap table in a div?
            html_output.append(html_chunk)
            
    return "\n".join(html_output)

def render_paragraph(para: Paragraph, clause_pattern, current_clause_id, para_index):
    text = para.text.strip()
    if not text:
        return "", current_clause_id, para_index

    # Determine Clause ID
    # Note: This logic must match doc_parser.py exactly to ensure diffs line up.
    # doc_parser iterates ONLY paragraphs.
    # Here we also iterate paragraphs (skipping tables for ID counting if doc_parser skips them).
    # doc_parser.py:
    # para_index += 1
    # match = clause_pattern.match(text)
    
    para_index += 1
    match = clause_pattern.match(text)
    
    clause_id = None
    if match:
        current_clause_id = match.group(1)
        clause_id = current_clause_id
    else:
        if current_clause_id:
            clause_id = current_clause_id
        else:
            clause_id = f"para_{para_index}"
            
    # Render HTML
    # Handle runs for bold/italic
    inner_html = ""
    for run in para.runs:
        run_text = html.escape(run.text)
        if run.bold:
            run_text = f"<b>{run_text}</b>"
        if run.italic:
            run_text = f"<i>{run_text}</i>"
        if run.underline:
            run_text = f"<u>{run_text}</u>"
        inner_html += run_text
        
    # Styles
    style_classes = []
    if para.alignment:
        # Map alignment to classes or style
        pass
        
    # Indentation could be handled here
    
    p_tag = f'<p class="mb-4 leading-relaxed text-slate-700" data-clause-id="{clause_id}">{inner_html}</p>'
    return p_tag, current_clause_id, para_index

def render_table(table: Table):
    rows_html = []
    for row in table.rows:
        cells_html = []
        for cell in row.cells:
            # Render cell content (paragraphs inside cell)
            # For simplicity, just join text for now, or render paragraphs?
            # Cells contain paragraphs.
            cell_content = []
            for para in cell.paragraphs:
                # We don't assign clause IDs inside tables for now to avoid messing up the main sequence
                # unless we want to diff inside tables.
                # Let's just render text.
                cell_content.append(html.escape(para.text))
            
            cell_html = "<br>".join(cell_content)
            cells_html.append(f'<td class="border border-slate-300 p-2">{cell_html}</td>')
        
        rows_html.append(f'<tr>{"".join(cells_html)}</tr>')
        
    return f'<div class="my-6 overflow-x-auto"><table class="w-full border-collapse border border-slate-300">{"".join(rows_html)}</table></div>'
