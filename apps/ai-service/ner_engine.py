import os
import json
import re
from typing import List, Dict, Any
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and api_key != "mock_key_or_set_real_gemini_api_key":
        try:
            return genai.Client(api_key=api_key)
        except Exception as e:
            print(f"Failed to initialize Gemini client: {e}")
            return None
    return None

def extract_entities_fallback(text: str) -> List[Dict[str, Any]]:
    """Robust NLP technical skill extractor that handles both full paragraph prose and skill lists."""
    extracted = []
    seen = set()

    # Words to never extract as standalone skills (sentence verbs, pronouns, general words)
    invalid_standalone = {
        'designs', 'implements', 'maintains', 'protect', 'role', 'involves', 'improving', 'applications', 
        'systems', 'networks', 'solutions', 'organization', 'data', 'threats', 'cyber', 'such', 'well', 
        'also', 'work', 'using', 'used', 'build', 'building', 'create', 'creating', 'engineer', 'developer'
    }

    # 1. Primary multi-word technical concepts & known domain terms
    known_concepts = [
        ("vulnerability assessment", "Vulnerability Assessment"),
        ("incident response", "Incident Response"),
        ("security monitoring", "Security Monitoring"),
        ("threat detection", "Threat Detection"),
        ("defensive controls", "Defensive Controls"),
        ("threat intelligence", "Threat Intelligence"),
        ("mitre att&ck", "MITRE ATT&CK"),
        ("cybersecurity", "Cybersecurity"),
        ("network security", "Network Security"),
        ("machine learning", "Machine Learning"),
        ("ai models", "AI Models"),
        ("data preprocessing", "Data Preprocessing"),
        ("model development", "Model Development"),
        ("model optimization", "Model Optimization"),
        ("model deployment", "Model Deployment"),
        ("performance monitoring", "Performance Monitoring"),
        ("firewalls", "Firewalls"),
        ("ids/ips", "IDS/IPS"),
        ("siem", "SIEM"),
        ("linux", "Linux"),
        ("python", "Python"),
        ("networking", "Networking"),
        ("react", "React"),
        ("typescript", "TypeScript"),
        ("node.js", "Node.js"),
        ("express", "Express.js"),
        ("postgresql", "PostgreSQL"),
        ("docker", "Docker"),
        ("kubernetes", "Kubernetes"),
        ("aws", "AWS")
    ]

    text_lower = text.lower()
    for phrase, display_name in known_concepts:
        if phrase in text_lower and display_name.lower() not in seen:
            seen.add(display_name.lower())
            extracted.append({
                "type": "skill",
                "value": display_name,
                "confidence": 0.95,
                "yearsOfExperience": 3
            })

    # 2. Extract technical terms from comma/bullet list if not a full sentence
    raw_items = re.split(r'[,;\n]+|\band\b', text, flags=re.I)
    for raw in raw_items:
        clean = raw.strip()
        clean = re.sub(r'^(such as|including|like|and|or|etc\.?|knowledge of|experience with|proficient in|security frameworks such as)\s+', '', clean, flags=re.I).strip()
        clean = re.sub(r'[.:;!]+$', '', clean).strip()

        # Skip sentence fragments containing intro verbs
        if re.search(r'\b(designs|implements|maintains|protect|involves|improving)\b', clean, re.I):
            continue

        if 2 <= len(clean) <= 35 and clean.lower() not in seen:
            if clean.lower() in invalid_standalone:
                continue
            seen.add(clean.lower())
            
            # Format nicely
            formatted = clean
            if not re.match(r'^[A-Z0-9\/& -]+$', clean) and not re.search(r'[A-Z]', clean[1:]):
                formatted = ' '.join(w.capitalize() for w in clean.split())

            extracted.append({
                "type": "skill",
                "value": formatted,
                "confidence": 0.90
            })

    return extracted

def extract_resume_entities(text: str) -> List[Dict[str, Any]]:
    client = get_gemini_client()
    if not client:
        return extract_entities_fallback(text)
    
    prompt = f"""
You are an expert HR AI Named Entity Recognition parser. Analyze the following resume text and extract structured technical skills, qualifications, and tools in JSON format.

JSON Schema:
{{
  "entities": [
    {{
      "type": "skill" | "experience" | "education" | "contact",
      "value": "Normalized Technical Skill Name",
      "confidence": number between 0 and 1
    }}
  ]
}}

Resume Text:
---
{text[:4000]}
---

Return ONLY valid JSON.
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        if response.text:
            data = json.loads(response.text)
            return data.get("entities", [])
    except Exception as e:
        print(f"Gemini NER extraction error: {e}")
    
    return extract_entities_fallback(text)

def extract_job_requirements(job_description: str) -> List[Dict[str, Any]]:
    client = get_gemini_client()
    if not client:
        extracted = extract_entities_fallback(job_description)
        requirements = []
        for i, item in enumerate(extracted):
            if item["type"] == "skill":
                requirements.append({
                    "skill": item["value"],
                    "importance": "must_have" if i < 4 else "nice_to_have",
                    "confidence": item.get("confidence", 0.9)
                })
        return requirements

    prompt = f"""
You are an expert technical recruiting analyst and ontology engine.
Analyze the following Job Description and extract key required technical skills, tools, and technical domain competencies into structured JSON.

INTELLIGENCE GUIDELINES:
1. Do NOT extract sentence fragments, descriptive phrases, or verbs (e.g., never extract 'designs', 'implements', 'protect', 'involves', 'maintains'). Extract clean, recognized technical skills and competencies (e.g. 'Cybersecurity', 'Threat Detection', 'Vulnerability Assessment', 'Incident Response', 'Security Monitoring', 'Python', 'Docker', 'SIEM', 'AWS').
2. USE INTELLIGENT SENSE FOR IMPORTANCE:
   - "must_have": Core technical requirements, non-negotiable foundations, primary programming languages/frameworks, and fundamental domain pillars essential to succeed in the role.
   - "nice_to_have": Bonus qualifications, preferred tools, secondary frameworks, or 'plus'/'beneficial' skills.
3. Assign confidence scores between 0.85 and 0.99.

JSON Schema:
{{
  "requirements": [
    {{
      "skill": "Normalized Technical Skill Name",
      "importance": "must_have" | "nice_to_have",
      "confidence": number between 0 and 1
    }}
  ]
}}

Job Description:
---
{job_description[:4000]}
---

Return ONLY valid JSON.
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        if response.text:
            data = json.loads(response.text)
            return data.get("requirements", [])
    except Exception as e:
        print(f"Gemini job requirement extraction error: {e}")

    fallback_items = extract_entities_fallback(job_description)
    return [
        {
            "skill": item["value"],
            "importance": "must_have" if i < 4 else "nice_to_have",
            "confidence": 0.95
        }
        for i, item in enumerate(fallback_items) if item["type"] == "skill"
    ]
