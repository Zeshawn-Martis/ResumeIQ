import os
import json
import math
import numpy as np
from typing import List, Dict, Any, Tuple
from ner_engine import get_gemini_client, extract_resume_entities, extract_job_requirements
from google.genai import types

def normalize_skill(skill: str) -> str:
    s = skill.lower().strip()
    synonyms = {
        "react.js": "react",
        "reactjs": "react",
        "node.js": "node",
        "nodejs": "node",
        "ts": "typescript",
        "js": "javascript",
        "py": "python",
        "postgres": "postgresql",
        "aws": "amazon web services",
        "docker": "containerization",
    }
    return synonyms.get(s, s)

def compute_lexical_score(candidate_skills: List[str], required_skills: List[Dict[str, Any]]) -> Tuple[float, List[str], List[str], List[Dict[str, Any]]]:
    """
    Computes weighted lexical match score (0..100) based on extracted normalized skills.
    Must-have skills carry 1.5x weight over nice-to-have skills.
    """
    cand_set = {normalize_skill(s) for s in candidate_skills}
    matched_skills = []
    missing_skills = []
    skill_gaps = []

    total_weight = 0.0
    earned_weight = 0.0

    for req in required_skills:
        raw_skill = req.get("skill", "")
        norm_skill = normalize_skill(raw_skill)
        importance = req.get("importance", "must_have")
        weight = 1.5 if importance == "must_have" else 1.0
        total_weight += weight

        if norm_skill in cand_set or any(norm_skill in c or c in norm_skill for c in cand_set):
            earned_weight += weight
            matched_skills.append(raw_skill)
            skill_gaps.append({
                "skill": raw_skill,
                "importance": importance,
                "status": "matched",
                "suggestionText": f"Demonstrated competency in {raw_skill} matches job criteria."
            })
        else:
            missing_skills.append(raw_skill)
            suggestion = (
                f"High priority: Highlight hands-on experience or relevant projects with {raw_skill}."
                if importance == "must_have" else
                f"Optional bonus: Add familiarity with {raw_skill} to boost compatibility."
            )
            skill_gaps.append({
                "skill": raw_skill,
                "importance": importance,
                "status": "missing",
                "suggestionText": suggestion
            })

    lexical_score = (earned_weight / total_weight * 100.0) if total_weight > 0 else 50.0
    return round(lexical_score, 1), matched_skills, missing_skills, skill_gaps

def get_embedding(text: str) -> List[float]:
    client = get_gemini_client()
    if client:
        try:
            res = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text[:2000]
            )
            if hasattr(res, 'embeddings') and res.embeddings:
                return res.embeddings[0].values
            if hasattr(res, 'embedding') and hasattr(res.embedding, 'values'):
                return res.embedding.values
        except Exception as e:
            print(f"Gemini embedding error: {e}")
    
    # Simple deterministic fallback pseudo-embedding vector if API unavailable
    words = set(re_words(text.lower()))
    vector = [1.0 if hash(w) % 128 == i else 0.0 for i in range(128) for w in words]
    if not any(vector):
        return [0.0] * 128
    norm = math.sqrt(sum(v*v for v in vector))
    return [v / norm for v in vector]

def re_words(text: str) -> List[str]:
    import re
    return re.findall(r'\w+', text)

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if not vec1 or not vec2:
        return 0.5
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    min_len = min(len(v1), len(v2))
    v1 = v1[:min_len]
    v2 = v2[:min_len]
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.5
    sim = dot / (norm1 * norm2)
    # Scale from [-1, 1] to [0, 100]
    scaled = ((sim + 1.0) / 2.0) * 100.0
    return float(np.clip(scaled, 0.0, 100.0))

def generate_explanation(
    lexical_score: float,
    semantic_score: float,
    final_score: float,
    matched_skills: List[str],
    missing_skills: List[str],
    job_title: str
) -> str:
    client = get_gemini_client()
    if client:
        prompt = f"""
You are an expert HR Talent Specialist. Generate a concise, 3-sentence explainable candidate summary for the role of "{job_title}".

Metrics:
- Overall Match Score: {final_score:.1f}/100
- Skill Lexical Score: {lexical_score:.1f}/100
- Contextual Semantic Score: {semantic_score:.1f}/100
- Key Matched Skills: {', '.join(matched_skills[:6]) if matched_skills else 'None'}
- Key Missing Skills: {', '.join(missing_skills[:6]) if missing_skills else 'None'}

Rules:
1. Explain specifically WHY the candidate received this rating based on lexical vs semantic breakdown.
2. Highlight key strengths and critical missing skill gaps without fluff.
3. Keep it objective, actionable, and under 75 words total.
"""
        try:
            res = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            if res.text:
                return res.text.strip()
        except Exception as e:
            print(f"Explanation generation error: {e}")

    # Fallback explanation
    match_level = "strong" if final_score >= 85 else ("moderate" if final_score >= 70 else "weak")
    matched_str = ", ".join(matched_skills[:4]) if matched_skills else "basic technical domain concepts"
    missing_str = ", ".join(missing_skills[:4]) if missing_skills else "no critical requirements"
    return (
        f"The candidate exhibits a {match_level} overall alignment ({final_score:.1f}%) for {job_title}. "
        f"They demonstrate solid coverage in {matched_str} (lexical score: {lexical_score:.1f}%), while semantic similarity registers at {semantic_score:.1f}%. "
        f"To maximize role fit, closing gaps in {missing_str} is recommended."
    )

def calculate_hybrid_match(
    resume_text: str,
    job_description: str,
    candidate_skills: List[str] = None,
    job_requirements: List[Dict[str, Any]] = None,
    job_title: str = "Target Role"
) -> Dict[str, Any]:
    # Extract entities if not provided
    if not candidate_skills:
        entities = extract_resume_entities(resume_text)
        candidate_skills = [e["value"] for e in entities if e.get("type") == "skill"]

    if not job_requirements:
        job_requirements = extract_job_requirements(job_description)

    # 1. Lexical Score
    lexical_score, matched_skills, missing_skills, skill_gaps = compute_lexical_score(
        candidate_skills, job_requirements
    )

    # 2. Semantic Score
    emb_resume = get_embedding(resume_text)
    emb_job = get_embedding(job_description)
    semantic_score = round(cosine_similarity(emb_resume, emb_job), 1)

    # 3. Hybrid Final Score (0.6 lexical + 0.4 semantic)
    final_score = round((0.6 * lexical_score) + (0.4 * semantic_score), 1)

    # 4. Generate AI Explanation
    explanation = generate_explanation(
        lexical_score, semantic_score, final_score, matched_skills, missing_skills, job_title
    )

    return {
        "lexical_score": lexical_score,
        "semantic_score": semantic_score,
        "final_score": final_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skill_gaps": skill_gaps,
        "explanation": explanation
    }
