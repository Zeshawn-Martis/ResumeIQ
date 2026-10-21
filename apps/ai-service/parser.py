import io
import fitz
from pypdf import PdfReader
import docx
from typing import Optional
from ner_engine import get_gemini_client
from google.genai import types

def extract_text_from_pdf(file_bytes: bytes) -> str:
    # 1. Try PyMuPDF (fast, accurate for standard digital PDFs)
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text += page_text + "\n"
        if len(text.strip()) > 50:
            return text.strip()
    except Exception as e:
        print(f"PyMuPDF error: {e}")

    # 2. Try pypdf fallback
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        if len(text.strip()) > 50:
            return text.strip()
    except Exception as e:
        print(f"pypdf error: {e}")

    # 3. If PDF has vector glyphs, canvas paths, or scanned images without font maps, use Gemini Vision OCR
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        if len(doc) > 0:
            client = get_gemini_client()
            if client:
                full_ocr_text = []
                for page in doc:
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    res = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=[
                            types.Part.from_bytes(data=img_bytes, mime_type='image/png'),
                            'Extract all plain text from this resume document accurately line by line. Maintain original headings and bullet points. Do not summarize or alter text.'
                        ]
                    )
                    if res and res.text:
                        full_ocr_text.append(res.text)
                combined = "\n\n".join(full_ocr_text).strip()
                if combined:
                    return combined
    except Exception as e:
        print(f"Gemini OCR fallback error: {e}")

    return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = []
        for para in doc.paragraphs:
            if para.text:
                full_text.append(para.text)
        return "\n".join(full_text).strip()
    except Exception as e:
        print(f"Error parsing DOCX: {e}")
        return ""

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        return extract_text_from_pdf(file_bytes)
    elif ext in ['docx', 'doc']:
        return extract_text_from_docx(file_bytes)
    else:
        # Fallback raw text decoding
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return ""
