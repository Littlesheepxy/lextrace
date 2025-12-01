import os
import json
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# 默认使用的模型
DEFAULT_MODEL = "google/gemini-2.0-flash-001"

client = None
if OPENROUTER_API_KEY:
    client = OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
    )

def analyze_diffs(diffs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes a list of clause diffs using AI to generate a summary and risk assessment.
    Returns: { "summary": str, "risk_assessments": { clause_id: { risk, reason } } }
    """
    if not OPENROUTER_API_KEY:
        return {
            "summary": "AI API Key not configured.",
            "risk_assessments": {}
        }

    # Filter only modified/added/deleted clauses to save tokens
    changes = [d for d in diffs if d['type'] in ('added', 'modified', 'deleted')]
    
    if not changes:
        return {
            "summary": "No significant changes detected.",
            "risk_assessments": {}
        }

    prompt = f"""
    你是一位法律专家AI。请分析以下合同变更内容：
    
    {json.dumps(changes, indent=2, ensure_ascii=False)}
    
    任务 1：生成一份简明的变更执行摘要（最多3句话）。
    任务 2：针对每一项变更，评估风险等级（高、中、低）并提供非常简短的理由。
    
    输出 JSON 格式：
    {{
        "summary": "...",
        "risk_assessments": {{
            "clause_id": {{ "risk": "high/medium/low", "reason": "..." }}
        }}
    }}
    """

    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": "你是一位乐于助人的法律助手。"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "summary": result.get("summary", "AI analysis completed."),
            "risk_assessments": result.get("risk_assessments", {})
        }

    except Exception as e:
        print(f"AI Analysis failed: {e}")
        return {
            "summary": "AI analysis failed.",
            "risk_assessments": {}
        }


def analyze_clause_evolution(
    clause_id: str,
    clause_path: List[str],
    version_changes: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    分析条款在多个版本中的演变，生成 AI 总结。
    
    参数:
        clause_id: 条款 ID
        clause_path: 条款路径，如 ["第二条 合同金额与付款", "2.1 合同总价"]
        version_changes: 版本变化列表，每个元素包含:
            - versionNumber: 版本号
            - content: 该版本的条款内容
            - changeFromPrev: 与上一版本的变化 {type, summary}
    
    返回:
        {
            "oneLiner": "一句话摘要",
            "evolutionSummary": "多版本演进总结",
            "riskNotes": "风险提示（可选）"
        }
    """
    if not OPENROUTER_API_KEY or not client:
        # 回退到基于规则的简单总结
        return _generate_fallback_summary(version_changes)
    
    # 过滤出有变化的版本
    changes_with_content = []
    for vc in version_changes:
        if vc.get('content'):
            change_info = {
                "版本号": f"V{vc['versionNumber']}",
                "内容": vc['content'][:500] if vc['content'] else "(无内容)",  # 限制长度
            }
            if vc.get('changeFromPrev'):
                change_info["变化类型"] = vc['changeFromPrev'].get('type', 'unknown')
                change_info["变化摘要"] = vc['changeFromPrev'].get('summary', '')
            changes_with_content.append(change_info)
    
    if not changes_with_content:
        return _generate_fallback_summary(version_changes)
    
    clause_path_str = " > ".join(clause_path) if clause_path else clause_id
    
    prompt = f"""你是一位资深法律顾问，正在审查合同条款的多版本演变历史。

## 条款信息
- 条款路径: {clause_path_str}
- 条款 ID: {clause_id}

## 各版本内容演变
{json.dumps(changes_with_content, indent=2, ensure_ascii=False)}

## 任务
请分析该条款在各版本中的演变，输出 JSON 格式：

{{
    "oneLiner": "用一句话概括该条款的主要变化趋势（最多30字）",
    "evolutionSummary": "详细分析各版本的关键变更点，说明变化的方向和影响（100-200字）",
    "riskNotes": "如果发现潜在风险点，请指出；如果没有明显风险，返回 null"
}}

注意：
1. 重点关注数字、比例、金额、期限等实质性变化
2. 分析变化对合同双方权益的影响
3. 如果条款变化幅度大或涉及关键权益，务必在 riskNotes 中提醒
"""

    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": "你是一位专业的法律顾问，擅长合同审查和风险分析。请用中文回复。"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "oneLiner": result.get("oneLiner", "条款经历了多次修改"),
            "evolutionSummary": result.get("evolutionSummary", "该条款在多个版本中有所调整。"),
            "riskNotes": result.get("riskNotes")
        }

    except Exception as e:
        print(f"Clause evolution analysis failed: {e}")
        return _generate_fallback_summary(version_changes)


def _generate_fallback_summary(version_changes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    当 AI 不可用时，生成基于规则的简单总结。
    """
    total_versions = len(version_changes)
    modified_count = sum(
        1 for vc in version_changes 
        if vc.get('changeFromPrev', {}).get('type') == 'modified'
    )
    
    if modified_count == 0:
        return {
            "oneLiner": "本条款在所有版本中保持稳定",
            "evolutionSummary": f"该条款在 {total_versions} 个版本中未发生实质性变化，内容保持一致。",
            "riskNotes": None
        }
    elif modified_count <= 2:
        return {
            "oneLiner": f"本条款经历了 {modified_count} 次小幅调整",
            "evolutionSummary": f"该条款在 {total_versions} 个版本中有 {modified_count} 次修改，整体保持稳定。",
            "riskNotes": None
        }
    else:
        return {
            "oneLiner": f"本条款变化频繁，共修改 {modified_count} 次",
            "evolutionSummary": f"该条款在 {total_versions} 个版本中经历了 {modified_count} 次修改，变化较为频繁，建议仔细审查各版本变更内容。",
            "riskNotes": "条款变化频繁，建议关注各版本的具体修改内容。"
        }
