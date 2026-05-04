from pydantic import BaseModel

from app.schemas.poliza import PolizaSummary


class ComisionAseguradora(BaseModel):
    aseguradora: str
    total: float
    pagado: float


class ComisionTipo(BaseModel):
    tipo: str
    total: float


class ReporteComisiones(BaseModel):
    total_ganado: float
    total_pagado: float
    total_pendiente: float
    por_aseguradora: list[ComisionAseguradora]
    por_tipo: list[ComisionTipo]
    polizas: list[PolizaSummary]


class VencimientoMes(BaseModel):
    mes: str
    total: int


class ActividadMetrica(BaseModel):
    actual: int
    anterior: int
    cambio_porcentaje: float


class ReporteActividad(BaseModel):
    nuevos_clientes: ActividadMetrica
    nuevas_polizas: ActividadMetrica
    tareas_completadas: ActividadMetrica


class AICostoProveedor(BaseModel):
    proveedor: str
    calls: int
    total_usd: float


class AICostoDia(BaseModel):
    fecha: str
    total_usd: float


class ReporteAICostos(BaseModel):
    total_usd: float
    por_proveedor: list[AICostoProveedor]
    por_dia: list[AICostoDia]
    promedio_por_llamada: float
    presupuesto_mensual: float
    porcentaje_usado: float
    alerta_activa: bool
