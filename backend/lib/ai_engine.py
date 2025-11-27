import os
import json
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

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
            model="google/gemini-3-pro-preview", # Use Gemini 3 Pro Preview
            messages=[
                {"role": "system", "content": "你是一位乐于助人的法律助手。"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            extra_body={"reasoning": {"enabled": True}}
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
