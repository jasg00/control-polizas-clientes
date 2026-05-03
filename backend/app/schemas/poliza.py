from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, computed_field

from app.schemas.cliente import ClienteOut


class PolizaCreate(BaseModel):
    numero: str
    tipo: str
    aseguradora: str
    plan: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    prima: Decimal
    moneda: str = "MXN"
    periodo_gracia_dias: int = 0
    porcentaje_comision: Decimal = Decimal("0")
    detalles: Optional[dict[str, Any]] = None
    notas: Optional[str] = None
    cliente_id: int


class PolizaUpdate(BaseModel):
    numero: Optional[str] = None
    tipo: Optional[str] = None
    aseguradora: Optional[str] = None
    plan: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    prima: Optional[Decimal] = None
    moneda: Optional[str] = None
    periodo_gracia_dias: Optional[int] = None
    estatus: Optional[str] = None
    porcentaje_comision: Optional[Decimal] = None
    comision_pagada: Optional[bool] = None
    detalles: Optional[dict[str, Any]] = None
    notas: Optional[str] = None
    cliente_id: Optional[int] = None


class PolizaSummary(BaseModel):
    id: int
    numero: str
    tipo: str
    aseguradora: str
    plan: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    prima: Decimal
    moneda: str
    estatus: str
    monto_comision: Decimal
    comision_pagada: bool
    cliente_id: int
    cliente: Optional[ClienteOut] = None

    @computed_field
    @property
    def dias_restantes(self) -> int:
        return max(0, (self.fecha_fin - date.today()).days)

    model_config = {"from_attributes": True, "arbitrary_types_allowed": True}


class PolizaOut(PolizaSummary):
    periodo_gracia_dias: int
    porcentaje_comision: Decimal
    detalles: Optional[dict[str, Any]] = None
    notas: Optional[str] = None
    agente_id: int
    cliente: ClienteOut
    created_at: datetime
    updated_at: datetime


def poliza_to_summary(poliza: Any) -> PolizaSummary:
    return PolizaSummary.model_validate(poliza, from_attributes=True)


def poliza_to_out(poliza: Any) -> PolizaOut:
    return PolizaOut.model_validate(poliza, from_attributes=True)
