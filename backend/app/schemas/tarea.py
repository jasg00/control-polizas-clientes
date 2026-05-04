from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.cliente import ClienteOut
from app.schemas.poliza import PolizaSummary
from app.schemas.usuario import UsuarioOut


class TareaCreate(BaseModel):
    titulo: str
    tipo: str
    prioridad: str
    fecha_vencimiento: date
    descripcion: Optional[str] = None
    cliente_id: Optional[int] = None
    poliza_id: Optional[int] = None
    asignada_a: Optional[int] = None


class TareaUpdate(BaseModel):
    titulo: Optional[str] = None
    tipo: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    descripcion: Optional[str] = None
    completada: Optional[bool] = None
    cliente_id: Optional[int] = None
    poliza_id: Optional[int] = None
    asignada_a: Optional[int] = None


class TareaOut(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str] = None
    tipo: str
    prioridad: str
    fecha_vencimiento: date
    completada: bool
    completada_en: Optional[datetime] = None
    cliente_id: Optional[int] = None
    poliza_id: Optional[int] = None
    asignada_a: int
    cliente: Optional[ClienteOut] = None
    poliza: Optional[PolizaSummary] = None
    usuario_asignado: UsuarioOut
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
