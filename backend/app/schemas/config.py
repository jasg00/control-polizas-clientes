from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ConfigLLMOut(BaseModel):
    id: int
    proveedor: str
    modelo: str
    api_key_masked: Optional[str] = None
    temperatura: float
    activo: bool


class ConfigLLMUpdate(BaseModel):
    proveedor: str
    modelo: str
    api_key: Optional[str] = None
    temperatura: float = 0.1
    activo: bool = True


class ConfigAlertasOut(BaseModel):
    id: int
    dias_anticipacion: list[int]
    email_agente_activo: bool
    email_cliente_activo: bool
    email_agente: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password_masked: Optional[str] = None
    smtp_from_name: Optional[str] = None


class ConfigAlertasUpdate(BaseModel):
    dias_anticipacion: list[int] = [60, 30, 15, 7]
    email_agente_activo: bool = True
    email_cliente_activo: bool = False
    email_agente: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_name: Optional[str] = None


class ConfigPresupuestoOut(BaseModel):
    id: int
    proveedor: str
    presupuesto_mensual_usd: Decimal
    alerta_porcentaje: int
    alerta_activa: bool

    model_config = {"from_attributes": True}


class ConfigPresupuestoUpdate(BaseModel):
    presupuesto_mensual_usd: Decimal
    alerta_porcentaje: int = 80


class ConfigTestOut(BaseModel):
    ok: bool
    modelo: Optional[str] = None
    latency_ms: Optional[int] = None
    error: Optional[str] = None
