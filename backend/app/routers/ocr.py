import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.limiter import limiter
from app.models.usuario import Usuario
from app.services.llm import extract_poliza
from app.services.pdf import extract_text

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

UPLOADS_TEMP = Path("uploads/temp")


@router.post("")
@limiter.limit("10/minute")
async def ocr_poliza(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=422, detail="Solo se permiten archivos PDF")

    contents = await file.read()

    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (max 20 MB)")

    UPLOADS_TEMP.mkdir(parents=True, exist_ok=True)
    temp_path = UPLOADS_TEMP / f"{uuid.uuid4()}.pdf"
    temp_path.write_bytes(contents)

    try:
        text = extract_text(contents)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return await extract_poliza(text, db, current_user.id)
