import io

MAX_CHARS = 8000


def extract_text_pdfplumber(file_bytes: bytes) -> str:
    import pdfplumber
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def extract_text_pymupdf(file_bytes: bytes) -> str:
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def extract_text(file_bytes: bytes) -> str:
    try:
        text = extract_text_pdfplumber(file_bytes)
        if text.strip():
            return text[:MAX_CHARS]
    except Exception:
        pass

    try:
        text = extract_text_pymupdf(file_bytes)
        if text.strip():
            return text[:MAX_CHARS]
    except Exception:
        pass

    raise ValueError("No se pudo extraer texto del PDF")
