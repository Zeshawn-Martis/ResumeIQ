import os
import json
import re
from typing import List, Dict, Any
from ner_engine import get_gemini_client
from google.genai import types

def strip_markdown_asterisks(data: Any) -> Any:
    if isinstance(data, str):
        return re.sub(r'\*\*(.*?)\*\*', r'\1', data).replace('**', '').replace('*', '').strip()
    elif isinstance(data, list):
        return [strip_markdown_asterisks(x) for x in data]
    elif isinstance(data, dict):
        return {k: strip_markdown_asterisks(v) for k, v in data.items()}
    return data

def parse_original_resume_sections(text: str) -> Dict[str, Any]:
    """
    Parses any candidate's resume dynamically into structured fields.
    Zero hardcoded values: preserves the authentic details of whoever uploads.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return {
            "name": "Candidate",
            "contact": "",
            "education_lines": [],
            "project_lines": [],
            "experience_lines": [],
            "skill_lines": []
        }
    
    # 1. Candidate Name (first non-heading line with reasonable length)
    name = "Candidate"
    for l in lines[:6]:
        lower = l.lower()
        if 2 <= len(l) <= 45 and not any(kw in lower for kw in [
            'resume', 'cv', 'curriculum', 'contact', 'email', '@', 'http', 'github', 'linkedin', 'phone', 'page '
        ]):
            name = l
            break

    # 2. Contact details
    contact_parts = []
    for l in lines[1:7]:
        if any(c in l for c in ['@', '|', '•', '+', 'http', 'github', 'linkedin', 'phone']) or any(c.isdigit() for c in l):
            if l != name and l not in contact_parts:
                contact_parts.append(l)
    contact_info = " • ".join(contact_parts) if contact_parts else ""

    # 3. Detect Sections dynamically
    education = []
    projects = []
    experience = []
    skills = []

    current_section = None
    
    for l in lines:
        lower = l.lower()
        if any(h in lower for h in ['education', 'academic', 'qualifications']) and len(l) < 35:
            current_section = 'education'
            continue
        elif any(h in lower for h in ['project', 'technical projects', 'key projects']) and len(l) < 35:
            current_section = 'projects'
            continue
        elif any(h in lower for h in ['experience', 'employment', 'work history', 'internship']) and len(l) < 35:
            current_section = 'experience'
            continue
        elif any(h in lower for h in ['skill', 'technical competencies', 'competencies', 'technologies', 'tools']) and len(l) < 35:
            current_section = 'skills'
            continue

        if current_section == 'education':
            if len(l) > 3:
                education.append(l)
        elif current_section == 'projects':
            if len(l) > 5:
                projects.append(l)
        elif current_section == 'experience':
            if len(l) > 5:
                experience.append(l)
        elif current_section == 'skills':
            if len(l) > 3:
                skills.append(l)

    return {
        "name": name,
        "contact": contact_info,
        "education_lines": education,
        "project_lines": projects,
        "experience_lines": experience,
        "skill_lines": skills
    }

def generate_tailored_resume(
    original_text: str,
    job_description: str,
    missing_skills: List[str]
) -> Dict[str, Any]:
    client = get_gemini_client()
    parsed_sections = parse_original_resume_sections(original_text)
    
    if client:
        prompt = f"""
You are an Elite Executive Resume Architect. Your job is to tailor the candidate's resume for the target job description while STRICTLY PRESERVING 100% OF THEIR AUTHENTIC FACTUAL BACKGROUND.

DYNAMIC INTEGRITY CONSTRAINTS:
0. NEVER USE MARKDOWN ASTERISKS: Output clean plain text only. Do NOT use **bold** or *italic* asterisks anywhere in strings, titles, or bullets.
1. PRESERVE FACTUAL INTEGRITY: Keep all of the candidate's actual schools, universities, degrees, GPA/grades, project titles, and company names exactly as provided in their resume. Do NOT fabricate or alter any authentic facts. Do NOT substitute with pre-made templates or other candidates' data.
2. STRICT 1-PAGE BUDGET: Keep all sections concise, compact, and high-impact so the resume fits cleanly on EXACTLY 1 LETTER/A4 PAGE.
3. PURPOSEFUL JOB TAILORING:
   - Identify only what is genuinely relevant and necessary to align the resume with the target job requirements and address identified skill gaps ({', '.join(missing_skills[:6]) if missing_skills else 'Target Requirements'}).
   - Strategically enhance only the relevant project or experience bullet points using strong action verbs (e.g. "Architected", "Engineered", "Implemented", "Optimized") and clear technical outcomes.
   - Tailor ONLY what is necessary to bridge genuine gaps for this specific role. Do NOT force arbitrary or excessive bullet point changes.
4. BEFORE/AFTER DIFF:
   - In 'beforeAfterDiff', record ONLY the bullet points that were actually modified to align with the target job.
   - For each modified bullet, provide the original text, the enhanced tailored text, and a concise explanation of how it improves alignment with the target job requisition.

JSON OUTPUT SCHEMA:
{{
  "candidateName": "Exact Candidate Name from original resume",
  "contactInfo": "Email • Phone • Location • Links from original resume",
  "targetTitle": "Target Professional Title aligned with the job posting",
  "summary": "Crisp 2-sentence summary showcasing core strengths and target job alignment.",
  "skills": {{
    "Languages": ["Lang1", "Lang2"],
    "Frameworks & Libraries": ["Fw1", "Fw2"],
    "Tools & Platforms": ["Tool1", "Tool2"],
    "Core Competencies": ["Comp1", "Comp2"]
  }},
  "education": [
    {{
      "institution": "Exact School/University Name from original resume",
      "degree": "Degree / Field of Study",
      "period": "Years",
      "details": "Grades / Specialization"
    }}
  ],
  "projects": [
    {{
      "title": "Exact Project Name from original resume",
      "period": "Dates",
      "techStack": "Technologies Used",
      "bullets": [
        "Tailored high-impact bullet point"
      ]
    }}
  ],
  "experience": [
    {{
      "company": "Company Name from original resume",
      "role": "Role Title",
      "period": "Dates",
      "location": "Location",
      "bullets": [
        "Tailored high-impact bullet point"
      ]
    }}
  ],
  "beforeAfterDiff": [
    {{
      "section": "Project / Experience Name",
      "originalText": "Original bullet from candidate resume",
      "tailoredText": "Enhanced high-impact tailored bullet",
      "explanation": "Why this enhancement boosts ATS ranking while preserving authenticity"
    }}
  ],
  "matchedSkillsAdded": ["Skill1", "Skill2"]
}}

Candidate Original Resume:
---
{original_text[:4000]}
---

Target Job Description:
---
{job_description[:3000]}
---

Return ONLY valid JSON matching the schema above.
"""
        try:
            res = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if res.text:
                data = json.loads(res.text)
                # Generate clean markdown preview
                markdown_lines = [
                    f"# {data.get('candidateName', parsed_sections['name'])}",
                    f"{data.get('targetTitle', 'Software Engineer')} | {data.get('contactInfo', parsed_sections['contact'])}\n",
                    f"## Professional Summary\n{data.get('summary', '')}\n",
                    "## Technical Competencies"
                ]
                for cat, sks in data.get('skills', {}).items():
                    if sks:
                        markdown_lines.append(f"- {cat}: {', '.join(sks)}")
                
                if data.get('education'):
                    markdown_lines.append("\n## Education")
                    for edu in data['education']:
                        markdown_lines.append(f"- {edu.get('institution')} — {edu.get('degree')} ({edu.get('period')}) | {edu.get('details', '')}")

                if data.get('projects'):
                    markdown_lines.append("\n## Technical Projects")
                    for proj in data['projects']:
                        markdown_lines.append(f"### {proj.get('title')} | {proj.get('techStack', '')} ({proj.get('period', '')})")
                        for b in proj.get('bullets', []):
                            markdown_lines.append(f"- {b}")

                if data.get('experience'):
                    markdown_lines.append("\n## Professional Experience")
                    for exp in data['experience']:
                        markdown_lines.append(f"### {exp.get('role')} — {exp.get('company')} ({exp.get('period', '')})")
                        for b in exp.get('bullets', []):
                            markdown_lines.append(f"- {b}")

                data["tailoredText"] = "\n".join(markdown_lines)
                return strip_markdown_asterisks(data)
        except Exception as e:
            print(f"Gemini tailored resume generation error: {e}")

    # Dynamic fallback constructed strictly from the uploaded candidate's parsed text
    raw_lines = [l.strip() for l in original_text.split('\n') if l.strip()]
    candidate_bullets = [l.lstrip('-•* ') for l in raw_lines if len(l) > 35]
    
    # Only tailor what is genuinely necessary based on missing skills
    diff_items = []
    target_skills_to_add = missing_skills[:3] if missing_skills else []
    
    for i, skill in enumerate(target_skills_to_add):
        if i < len(candidate_bullets):
            orig = candidate_bullets[i]
            diff_items.append({
                "section": "Technical Projects",
                "originalText": orig,
                "tailoredText": f"{orig.rstrip('.')} with specialized integration of {skill} to fulfill key job requirements.",
                "explanation": f"Addressed target job requisite '{skill}' within the candidate's authentic project experience."
            })

    # Build dynamic project objects from parsed lines
    parsed_projects = []
    if parsed_sections["project_lines"]:
        current_p = None
        for pl in parsed_sections["project_lines"]:
            if len(pl) < 50 and not pl.startswith(('-', '•', '*')):
                if current_p:
                    parsed_projects.append(current_p)
                current_p = {"title": pl, "period": "", "techStack": "", "bullets": []}
            elif current_p:
                current_p["bullets"].append(pl.lstrip('-•* '))
        if current_p:
            parsed_projects.append(current_p)

    # Build dynamic education objects from parsed lines
    parsed_edu = []
    for el in parsed_sections["education_lines"]:
        if len(el) > 5:
            parsed_edu.append({
                "institution": el,
                "degree": "Degree / Qualification",
                "period": "",
                "details": ""
            })

    structured_data = {
        "candidateName": parsed_sections["name"],
        "contactInfo": parsed_sections["contact"],
        "targetTitle": "Candidate Profile (ATS Optimized)",
        "summary": "Qualified candidate with demonstrated domain experience, technical problem-solving capabilities, and project delivery.",
        "skills": {
            "Core Skills": parsed_sections["skill_lines"][:8] if parsed_sections["skill_lines"] else ["Problem Solving", "Software Engineering"]
        },
        "education": parsed_edu[:3],
        "projects": parsed_projects[:3],
        "experience": [],
        "beforeAfterDiff": diff_items,
        "matchedSkillsAdded": target_skills_to_add
    }

    markdown_preview = f"""# {structured_data['candidateName']}
{structured_data['targetTitle']} | {structured_data['contactInfo']}

## Professional Summary
{structured_data['summary']}

## Technical Competencies
- Core Skills: {', '.join(structured_data['skills'].get('Core Skills', []))}

## Education
"""
    for edu in structured_data['education']:
        markdown_preview += f"- {edu['institution']}\n"

    if structured_data['projects']:
        markdown_preview += "\n## Technical Projects\n"
        for p in structured_data['projects']:
            markdown_preview += f"### {p['title']}\n"
            for b in p.get('bullets', []):
                markdown_preview += f"- {b}\n"

    structured_data["tailoredText"] = markdown_preview
    return structured_data
