from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentoCreate(BaseModel):
    tipo: str
    poliza_id: Optional[int] = None
    cliente_id: Optional[int] = None


class DocumentoOut(BaseModel):
    id: int
    nombre_original: str
    tipo: str
    tamano_bytes: int
    mime_type: str
    poliza_id: Optional[int] = None
    cliente_id: Optional[int] = None
    subido_por: int
    created_at: datetime

    model_config = {"from_attributes": True}
