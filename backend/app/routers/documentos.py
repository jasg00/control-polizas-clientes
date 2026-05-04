import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.documento import Documento
from app.models.poliza import Poliza
from app.models.usuario import Usuario
from app.schemas.documento import DocumentoOut

router = APIRouter(prefix="/api/documentos", tags=["documentos"])

UPLOADS_DIR = Path("uploads/documentos")
MAX_FILE_SIZE = 20 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}


def scoped_cliente_query(db: Session, user: Usuario):
    query = db.query(Cliente)
    if user.rol != "admin":
        query = query.filter(Cliente.agente_id == user.id)
    return query


def scoped_poliza_query(db: Session, user: Usuario):
    query = db.query(Poliza).filter(Poliza.deleted_at.is_(None))
    if user.rol != "admin":
        query = query.filter(Poliza.agente_id == user.id)
    return query


def get_scoped_cliente(cliente_id: int, db: Session, user: Usuario) -> Cliente:
    cliente = scoped_cliente_query(db, user).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def get_scoped_poliza(poliza_id: int, db: Session, user: Usuario) -> Poliza:
    poliza = scoped_poliza_query(db, user).filter(Poliza.id == poliza_id).first()
    if not poliza:
        raise HTTPException(status_code=404, detail="Poliza no encontrada")
    return poliza


def scoped_document_query(db: Session, user: Usuario):
    query = db.query(Documento).outerjoin(Documento.cliente).outerjoin(Documento.poliza)
    if user.rol != "admin":
        query = query.filter(or_(Cliente.agente_id == user.id, Poliza.agente_id == user.id))
    return query


def get_scoped_documento(documento_id: int, db: Session, user: Usuario) -> Documento:
    documento = scoped_document_query(db, user).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return documento


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def upload_documento(
    file: UploadFile = File(...),
    tipo: str = Form(...),
    poliza_id: Optional[int] = Form(default=None),
    cliente_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not poliza_id and not cliente_id:
        raise HTTPException(status_code=422, detail="Debes vincular el documento a una poliza o cliente")

    poliza = get_scoped_poliza(poliza_id, db, current_user) if poliza_id else None
    cliente = get_scoped_cliente(cliente_id, db, current_user) if cliente_id else None

    if poliza and cliente and poliza.cliente_id != cliente.id:
        raise HTTPException(status_code=422, detail="La poliza no pertenece al cliente indicado")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (max 20 MB)")

    original_name = file.filename or "documento"
    suffix = Path(original_name).suffix.lower()
    if file.content_type not in ALLOWED_MIME_TYPES or suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Tipo de archivo no permitido")

    safe_name = sanitize_filename(original_name)
    folder = UPLOADS_DIR / (f"poliza_{poliza.id}" if poliza else f"cliente_{cliente.id}")
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{safe_name}"
    path = folder / stored_name
    path.write_bytes(contents)

    documento = Documento(
        nombre_original=original_name,
        tipo=tipo,
        ruta_archivo=str(path),
        tamano_bytes=len(contents),
        mime_type=file.content_type or "application/octet-stream",
        poliza_id=poliza.id if poliza else None,
        cliente_id=cliente.id if cliente else (poliza.cliente_id if poliza else None),
        subido_por=current_user.id,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


@router.get("", response_model=list[DocumentoOut])
def list_documentos(
    poliza_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if poliza_id:
        get_scoped_poliza(poliza_id, db, current_user)
    if cliente_id:
        get_scoped_cliente(cliente_id, db, current_user)

    query = scoped_document_query(db, current_user)
    if poliza_id:
        query = query.filter(Documento.poliza_id == poliza_id)
    if cliente_id:
        query = query.filter(Documento.cliente_id == cliente_id)
    return query.order_by(Documento.created_at.desc()).all()


@router.get("/{documento_id}")
def download_documento(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    documento = get_scoped_documento(documento_id, db, current_user)
    path = Path(documento.ruta_archivo)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")

    return FileResponse(
        path,
        media_type=documento.mime_type,
        filename=documento.nombre_original,
    )


@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_documento(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    documento = get_scoped_documento(documento_id, db, current_user)
    path = Path(documento.ruta_archivo)
    if path.exists():
        path.unlink()
    db.delete(documento)
    db.commit()


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name.strip().replace(" ", "_")
    return re.sub(r"[^A-Za-z0-9._-]", "_", name) or "documento"
