from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.poliza import Poliza
from app.models.tarea import Tarea
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardStats
from app.schemas.poliza import poliza_to_summary
from app.services.alertas import update_estatus_polizas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def scoped_cliente_query(db: Session, user: Usuario):
    query = db.query(Cliente)
    if user.rol != "admin":
        query = query.filter(Cliente.agente_id == user.id)
    return query


def scoped_poliza_query(db: Session, user: Usuario):
    query = db.query(Poliza).options(joinedload(Poliza.cliente)).filter(Poliza.deleted_at.is_(None))
    if user.rol != "admin":
        query = query.filter(Poliza.agente_id == user.id)
    return query


def scoped_tarea_query(db: Session, user: Usuario):
    query = (
        db.query(Tarea)
        .options(
            joinedload(Tarea.cliente),
            joinedload(Tarea.poliza).joinedload(Poliza.cliente),
            joinedload(Tarea.usuario_asignado),
        )
    )
    if user.rol != "admin":
        query = query.filter(Tarea.asignada_a == user.id)
    return query


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    update_estatus_polizas(db)
    today = date.today()
    now = datetime.utcnow()

    poliza_scope = scoped_poliza_query(db, current_user)
    tarea_scope = scoped_tarea_query(db, current_user)

    active_statuses = ["activa", "por_vencer"]
    total_clientes = scoped_cliente_query(db, current_user).count()
    total_polizas_activas = poliza_scope.filter(Poliza.estatus.in_(active_statuses)).count()
    polizas_vencen_7_dias = poliza_scope.filter(
        Poliza.estatus.in_(active_statuses),
        Poliza.fecha_fin >= today,
        Poliza.fecha_fin <= today + timedelta(days=7),
    ).count()
    polizas_vencen_30_dias = poliza_scope.filter(
        Poliza.estatus.in_(active_statuses),
        Poliza.fecha_fin >= today,
        Poliza.fecha_fin <= today + timedelta(days=30),
    ).count()

    monthly_polizas = poliza_scope.filter(
        extract("year", Poliza.created_at) == now.year,
        extract("month", Poliza.created_at) == now.month,
    )
    comision_mes_ganada = monthly_polizas.with_entities(func.coalesce(func.sum(Poliza.monto_comision), 0)).scalar() or 0
    comision_mes_pagada = monthly_polizas.filter(Poliza.comision_pagada == True).with_entities(
        func.coalesce(func.sum(Poliza.monto_comision), 0)
    ).scalar() or 0

    tareas_vencidas = tarea_scope.filter(Tarea.completada == False, Tarea.fecha_vencimiento < today).count()
    tareas_hoy = tarea_scope.filter(Tarea.completada == False, Tarea.fecha_vencimiento <= today).count()

    proximas_renovaciones = (
        poliza_scope.filter(
            Poliza.estatus.in_(active_statuses),
            Poliza.fecha_fin >= today,
            Poliza.fecha_fin <= today + timedelta(days=60),
        )
        .order_by(Poliza.fecha_fin.asc(), Poliza.numero.asc())
        .limit(5)
        .all()
    )

    tareas_pendientes_hoy = (
        tarea_scope.filter(Tarea.completada == False, Tarea.fecha_vencimiento <= today)
        .order_by(Tarea.fecha_vencimiento.asc(), Tarea.prioridad.asc())
        .limit(5)
        .all()
    )

    return DashboardStats(
        total_clientes=total_clientes,
        total_polizas_activas=total_polizas_activas,
        polizas_vencen_7_dias=polizas_vencen_7_dias,
        polizas_vencen_30_dias=polizas_vencen_30_dias,
        comision_mes_ganada=float(comision_mes_ganada),
        comision_mes_pagada=float(comision_mes_pagada),
        tareas_vencidas=tareas_vencidas,
        tareas_hoy=tareas_hoy,
        proximas_renovaciones=[poliza_to_summary(poliza) for poliza in proximas_renovaciones],
        tareas_pendientes_hoy=tareas_pendientes_hoy,
    )
