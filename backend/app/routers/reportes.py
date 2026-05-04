from calendar import monthrange
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.config import ConfigPresupuesto
from app.models.llm_log import LLMCallLog
from app.models.poliza import Poliza
from app.models.tarea import Tarea
from app.models.usuario import Usuario
from app.schemas.poliza import poliza_to_summary
from app.schemas.reporte import (
    ActividadMetrica,
    AICostoDia,
    AICostoProveedor,
    ComisionAseguradora,
    ComisionTipo,
    ReporteActividad,
    ReporteAICostos,
    ReporteComisiones,
    VencimientoMes,
)

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


def scoped_poliza_query(db: Session, user: Usuario):
    query = db.query(Poliza).options(joinedload(Poliza.cliente)).filter(Poliza.deleted_at.is_(None))
    if user.rol != "admin":
        query = query.filter(Poliza.agente_id == user.id)
    return query


def scoped_cliente_query(db: Session, user: Usuario):
    query = db.query(Cliente)
    if user.rol != "admin":
        query = query.filter(Cliente.agente_id == user.id)
    return query


def scoped_tarea_query(db: Session, user: Usuario):
    query = db.query(Tarea)
    if user.rol != "admin":
        query = query.filter(Tarea.asignada_a == user.id)
    return query


def month_bounds(mes: Optional[str]) -> tuple[date, date]:
    if not mes:
        today = date.today()
        year, month = today.year, today.month
    else:
        try:
            year, month = [int(part) for part in mes.split("-", 1)]
        except ValueError:
            raise HTTPException(status_code=422, detail="Formato de mes invalido. Usa YYYY-MM")
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


@router.get("/comisiones", response_model=ReporteComisiones)
def reporte_comisiones(
    mes: Optional[str] = Query(default=None),
    agente_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    start, end = month_bounds(mes)
    query = scoped_poliza_query(db, current_user).filter(
        Poliza.created_at >= datetime.combine(start, datetime.min.time()),
        Poliza.created_at <= datetime.combine(end, datetime.max.time()),
    )
    if agente_id:
        if current_user.rol != "admin":
            raise HTTPException(status_code=403, detail="Solo admin puede filtrar por agente")
        query = query.filter(Poliza.agente_id == agente_id)

    polizas = query.order_by(Poliza.created_at.desc(), Poliza.numero.asc()).all()
    total_ganado = sum(float(poliza.monto_comision or 0) for poliza in polizas)
    total_pagado = sum(float(poliza.monto_comision or 0) for poliza in polizas if poliza.comision_pagada)

    por_aseguradora: dict[str, dict[str, float]] = {}
    por_tipo: dict[str, float] = {}
    for poliza in polizas:
        amount = float(poliza.monto_comision or 0)
        aseguradora = poliza.aseguradora or "Sin aseguradora"
        por_aseguradora.setdefault(aseguradora, {"total": 0.0, "pagado": 0.0})
        por_aseguradora[aseguradora]["total"] += amount
        if poliza.comision_pagada:
            por_aseguradora[aseguradora]["pagado"] += amount
        por_tipo[poliza.tipo] = por_tipo.get(poliza.tipo, 0.0) + amount

    return ReporteComisiones(
        total_ganado=total_ganado,
        total_pagado=total_pagado,
        total_pendiente=total_ganado - total_pagado,
        por_aseguradora=[
            ComisionAseguradora(aseguradora=key, total=value["total"], pagado=value["pagado"])
            for key, value in sorted(por_aseguradora.items())
        ],
        por_tipo=[ComisionTipo(tipo=key, total=value) for key, value in sorted(por_tipo.items())],
        polizas=[poliza_to_summary(poliza) for poliza in polizas],
    )


@router.get("/vencimientos", response_model=list[VencimientoMes])
def reporte_vencimientos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    today = date.today()
    result: list[VencimientoMes] = []
    for offset in range(6):
        month = today.month + offset
        year = today.year + (month - 1) // 12
        normalized_month = ((month - 1) % 12) + 1
        start = date(year, normalized_month, 1)
        end = date(year, normalized_month, monthrange(year, normalized_month)[1])
        total = scoped_poliza_query(db, current_user).filter(Poliza.fecha_fin >= start, Poliza.fecha_fin <= end).count()
        result.append(VencimientoMes(mes=f"{year:04d}-{normalized_month:02d}", total=total))
    return result


@router.get("/actividad", response_model=ReporteActividad)
def reporte_actividad(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    today = date.today()
    current_start = date(today.year, today.month, 1)
    previous_month = today.month - 1 or 12
    previous_year = today.year - 1 if today.month == 1 else today.year
    previous_start = date(previous_year, previous_month, 1)
    previous_end = date(previous_year, previous_month, monthrange(previous_year, previous_month)[1])

    return ReporteActividad(
        nuevos_clientes=metric(
            count_created(scoped_cliente_query(db, current_user), Cliente.created_at, current_start, today),
            count_created(scoped_cliente_query(db, current_user), Cliente.created_at, previous_start, previous_end),
        ),
        nuevas_polizas=metric(
            count_created(scoped_poliza_query(db, current_user), Poliza.created_at, current_start, today),
            count_created(scoped_poliza_query(db, current_user), Poliza.created_at, previous_start, previous_end),
        ),
        tareas_completadas=metric(
            count_created(scoped_tarea_query(db, current_user), Tarea.completada_en, current_start, today),
            count_created(scoped_tarea_query(db, current_user), Tarea.completada_en, previous_start, previous_end),
        ),
    )


@router.get("/ai-costos", response_model=ReporteAICostos)
def reporte_ai_costos(
    mes: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    start, end = month_bounds(mes)
    query = db.query(LLMCallLog).filter(
        LLMCallLog.created_at >= datetime.combine(start, datetime.min.time()),
        LLMCallLog.created_at <= datetime.combine(end, datetime.max.time()),
    )
    if current_user.rol != "admin":
        query = query.filter(LLMCallLog.usuario_id == current_user.id)
    logs = query.order_by(LLMCallLog.created_at.asc()).all()

    total = sum(float(log.costo_usd or 0) for log in logs)
    provider_map: dict[str, dict[str, float | int]] = {}
    day_map: dict[str, float] = {}
    for log in logs:
        cost = float(log.costo_usd or 0)
        provider = log.proveedor or "desconocido"
        provider_map.setdefault(provider, {"calls": 0, "total_usd": 0.0})
        provider_map[provider]["calls"] = int(provider_map[provider]["calls"]) + 1
        provider_map[provider]["total_usd"] = float(provider_map[provider]["total_usd"]) + cost
        key = log.created_at.date().isoformat()
        day_map[key] = day_map.get(key, 0.0) + cost

    presupuestos = db.query(ConfigPresupuesto).all()
    presupuesto_total = sum(float(item.presupuesto_mensual_usd or 0) for item in presupuestos)
    alerta_activa = any(item.alerta_activa for item in presupuestos)
    porcentaje = (total / presupuesto_total * 100) if presupuesto_total else 0

    return ReporteAICostos(
        total_usd=total,
        por_proveedor=[
            AICostoProveedor(proveedor=provider, calls=int(values["calls"]), total_usd=float(values["total_usd"]))
            for provider, values in sorted(provider_map.items())
        ],
        por_dia=[AICostoDia(fecha=day, total_usd=total_day) for day, total_day in sorted(day_map.items())],
        promedio_por_llamada=total / len(logs) if logs else 0,
        presupuesto_mensual=presupuesto_total,
        porcentaje_usado=porcentaje,
        alerta_activa=alerta_activa or porcentaje >= 80,
    )


@router.get("/ai-costos/historial", response_model=list[dict])
def historial_ai_costos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = db.query(LLMCallLog).order_by(LLMCallLog.created_at.desc())
    if current_user.rol != "admin":
        query = query.filter(LLMCallLog.usuario_id == current_user.id)
    return [
        {
            "id": log.id,
            "usuario_id": log.usuario_id,
            "proveedor": log.proveedor,
            "modelo": log.modelo,
            "operacion": log.operacion,
            "input_tokens": log.input_tokens,
            "output_tokens": log.output_tokens,
            "costo_usd": float(log.costo_usd or 0),
            "exito": log.exito,
            "error_msg": log.error_msg,
            "created_at": log.created_at.isoformat(),
        }
        for log in query.limit(100).all()
    ]


def count_created(query, column, start: date, end: date) -> int:
    return query.filter(
        column.is_not(None),
        extract("year", column) == start.year,
        extract("month", column) == start.month,
        column <= datetime.combine(end, datetime.max.time()),
    ).count()


def metric(actual: int, anterior: int) -> ActividadMetrica:
    if anterior == 0:
        cambio = 100.0 if actual > 0 else 0.0
    else:
        cambio = ((actual - anterior) / anterior) * 100
    return ActividadMetrica(actual=actual, anterior=anterior, cambio_porcentaje=round(cambio, 1))
