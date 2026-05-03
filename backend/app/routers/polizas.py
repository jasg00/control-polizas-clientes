from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.poliza import Poliza
from app.models.usuario import Usuario
from app.schemas.poliza import (
    PolizaCreate,
    PolizaOut,
    PolizaSummary,
    PolizaUpdate,
    poliza_to_out,
    poliza_to_summary,
)

router = APIRouter(prefix="/api/polizas", tags=["polizas"])


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


def get_scoped_poliza(poliza_id: int, db: Session, user: Usuario) -> Poliza:
    poliza = scoped_poliza_query(db, user).filter(Poliza.id == poliza_id).first()
    if not poliza:
        raise HTTPException(status_code=404, detail="Poliza no encontrada")
    return poliza


def get_scoped_cliente(cliente_id: int, db: Session, user: Usuario) -> Cliente:
    cliente = scoped_cliente_query(db, user).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def calculate_commission(prima: Decimal, porcentaje: Decimal) -> Decimal:
    return (prima * porcentaje).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.get("", response_model=List[PolizaSummary])
def list_polizas(
    tipo: Optional[str] = Query(default=None),
    aseguradora: Optional[str] = Query(default=None),
    estatus: Optional[str] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    vence_en_dias: Optional[int] = Query(default=None, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = scoped_poliza_query(db, current_user)
    if tipo:
        query = query.filter(Poliza.tipo == tipo)
    if aseguradora:
        query = query.filter(Poliza.aseguradora == aseguradora)
    if estatus:
        query = query.filter(Poliza.estatus == estatus)
    if cliente_id:
        query = query.filter(Poliza.cliente_id == cliente_id)
    if vence_en_dias is not None:
        today = date.today()
        query = query.filter(Poliza.fecha_fin >= today, Poliza.fecha_fin <= today + timedelta(days=vence_en_dias))

    polizas = query.order_by(Poliza.fecha_fin.asc(), Poliza.numero.asc()).all()
    return [poliza_to_summary(poliza) for poliza in polizas]


@router.post("", response_model=PolizaOut, status_code=status.HTTP_201_CREATED)
def create_poliza(
    data: PolizaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = get_scoped_cliente(data.cliente_id, db, current_user)
    payload = data.model_dump()
    porcentaje = payload.get("porcentaje_comision") or Decimal("0")
    prima = payload["prima"]
    poliza = Poliza(
        **payload,
        agente_id=cliente.agente_id,
        monto_comision=calculate_commission(prima, porcentaje),
    )
    db.add(poliza)
    db.commit()
    db.refresh(poliza)
    return poliza_to_out(poliza)


@router.get("/{poliza_id}", response_model=PolizaOut)
def get_poliza(
    poliza_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    poliza = get_scoped_poliza(poliza_id, db, current_user)
    return poliza_to_out(poliza)


@router.put("/{poliza_id}", response_model=PolizaOut)
def update_poliza(
    poliza_id: int,
    data: PolizaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    poliza = get_scoped_poliza(poliza_id, db, current_user)
    payload = data.model_dump(exclude_unset=True)

    if "cliente_id" in payload:
        cliente = get_scoped_cliente(payload["cliente_id"], db, current_user)
        poliza.agente_id = cliente.agente_id

    for field, value in payload.items():
        setattr(poliza, field, value)

    if "prima" in payload or "porcentaje_comision" in payload:
        poliza.monto_comision = calculate_commission(poliza.prima, poliza.porcentaje_comision or Decimal("0"))

    db.commit()
    db.refresh(poliza)
    return poliza_to_out(poliza)


@router.delete("/{poliza_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poliza(
    poliza_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    poliza = get_scoped_poliza(poliza_id, db, current_user)
    poliza.deleted_at = datetime.utcnow()
    db.commit()
