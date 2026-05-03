from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, computed_field


class ClienteCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    notas: Optional[str] = None


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    notas: Optional[str] = None


class ClienteOut(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    notas: Optional[str] = None
    agente_id: int
    polizas_activas: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


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

    @computed_field
    @property
    def dias_restantes(self) -> int:
        return max(0, (self.fecha_fin - date.today()).days)

    model_config = {"from_attributes": True, "arbitrary_types_allowed": True}


class ClienteWithPolizas(ClienteOut):
    polizas: list[PolizaSummary] = []


class ClienteOutWithExtras(ClienteOut):
    model_config = {"from_attributes": True}


def active_polizas(cliente: Any) -> list[Any]:
    return [poliza for poliza in getattr(cliente, "polizas", []) if getattr(poliza, "deleted_at", None) is None]


def cliente_to_out(cliente: Any) -> ClienteOut:
    polizas_activas = sum(1 for poliza in active_polizas(cliente) if poliza.estatus == "activa")
    return ClienteOut.model_validate(cliente, from_attributes=True).model_copy(
        update={"polizas_activas": polizas_activas}
    )


def cliente_to_detail(cliente: Any) -> ClienteWithPolizas:
    polizas = active_polizas(cliente)
    polizas_activas = sum(1 for poliza in polizas if poliza.estatus == "activa")
    return ClienteWithPolizas.model_validate(cliente, from_attributes=True).model_copy(
        update={"polizas_activas": polizas_activas, "polizas": polizas}
    )
