from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.alerta import AlertaEnviada
from app.models.config import ConfigAlertas
from app.models.poliza import Poliza
from app.models.usuario import Usuario
from app.schemas.alerta import AlertaEnviadaOut, AlertasProximasOut
from app.schemas.poliza import poliza_to_summary
from app.services.alertas import (
    bucket_polizas,
    destinatarios_alerta,
    enviar_alerta_email,
    get_polizas_proximas_vencer,
    registrar_alerta,
    update_estatus_polizas,
)

router = APIRouter(prefix="/api/alertas", tags=["alertas"])


def scoped_poliza_query(db: Session, user: Usuario):
    query = db.query(Poliza).options(joinedload(Poliza.cliente)).filter(Poliza.deleted_at.is_(None))
    if user.rol != "admin":
        query = query.filter(Poliza.agente_id == user.id)
    return query


def get_scoped_poliza(poliza_id: int, db: Session, user: Usuario) -> Poliza:
    poliza = scoped_poliza_query(db, user).filter(Poliza.id == poliza_id).first()
    if not poliza:
        raise HTTPException(status_code=404, detail="Poliza no encontrada")
    return poliza


@router.get("/proximas", response_model=AlertasProximasOut)
def proximas_alertas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    update_estatus_polizas(db)
    polizas = get_polizas_proximas_vencer(db, dias_max=60)
    if current_user.rol != "admin":
        polizas = [poliza for poliza in polizas if poliza.agente_id == current_user.id]
    buckets = bucket_polizas(polizas)
    return {
        key: [poliza_to_summary(poliza) for poliza in value]
        for key, value in buckets.items()
    }


@router.post("/enviar/{poliza_id}", response_model=AlertaEnviadaOut)
def enviar_alerta_manual(
    poliza_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    poliza = get_scoped_poliza(poliza_id, db, current_user)
    config = db.query(ConfigAlertas).first()
    if not config:
        raise HTTPException(status_code=503, detail="Configuracion de alertas no encontrada")

    destinatarios = destinatarios_alerta(poliza, config)
    if not destinatarios:
        raise HTTPException(status_code=422, detail="No hay destinatarios configurados para la alerta")

    dias = max(0, (poliza.fecha_fin - date.today()).days)
    destinatario = destinatarios[0]
    enviar_alerta_email(poliza, dias, config, destinatario)
    return registrar_alerta(db, poliza, dias, "email_manual", destinatario)


@router.get("/historial", response_model=list[AlertaEnviadaOut])
def historial_alertas(
    poliza_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = db.query(AlertaEnviada).join(AlertaEnviada.poliza)
    if current_user.rol != "admin":
        query = query.filter(Poliza.agente_id == current_user.id)
    if poliza_id:
        get_scoped_poliza(poliza_id, db, current_user)
        query = query.filter(AlertaEnviada.poliza_id == poliza_id)
    return query.order_by(AlertaEnviada.enviada_en.desc()).limit(100).all()
