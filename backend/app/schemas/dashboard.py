from app.schemas.poliza import PolizaSummary
from app.schemas.tarea import TareaOut
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_clientes: int
    total_polizas_activas: int
    polizas_vencen_7_dias: int
    polizas_vencen_30_dias: int
    comision_mes_ganada: float
    comision_mes_pagada: float
    tareas_vencidas: int
    tareas_hoy: int
    proximas_renovaciones: list[PolizaSummary]
    tareas_pendientes_hoy: list[TareaOut]
