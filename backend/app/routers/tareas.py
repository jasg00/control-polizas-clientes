from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.poliza import Poliza
from app.models.tarea import Tarea
from app.models.usuario import Usuario
from app.schemas.tarea import TareaCreate, TareaOut, TareaUpdate

router = APIRouter(prefix="/api/tareas", tags=["tareas"])


def scoped_cliente_query(db: Session, user: Usuario):
    query = db.query(Cliente)
    if user.rol != "admin":
        query = query.filter(Cliente.agente_id == user.id)
    return query


def scoped_poliza_query(db: Session, user: Usuario):
    query = db.query(Poliza).filter(Poliza.deleted_at.is_(None))
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


def get_scoped_tarea(tarea_id: int, db: Session, user: Usuario) -> Tarea:
    tarea = scoped_tarea_query(db, user).filter(Tarea.id == tarea_id).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return tarea


def get_scoped_cliente(cliente_id: int, db: Session, user: Usuario) -> Cliente:
    cliente = scoped_cliente_query(db, user).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def get_scoped_poliza(poliza_id: int, db: Session, user: Usuario) -> Poliza:
    poliza = scoped_poliza_query(db, user).filter(Poliza.id == poliza_id).first()
    if not poliza:
        raise HTTPException(status_code=404, detail="Poliza no encontrada")
    return poliza


def resolve_assignee(asignada_a: Optional[int], db: Session, user: Usuario) -> int:
    if user.rol != "admin":
        if asignada_a and asignada_a != user.id:
            raise HTTPException(status_code=403, detail="Solo un admin puede asignar tareas a otros usuarios")
        return user.id

    user_id = asignada_a or user.id
    assignee = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Usuario asignado no encontrado")
    return assignee.id


def validate_links(cliente_id: Optional[int], poliza_id: Optional[int], db: Session, user: Usuario) -> None:
    cliente = get_scoped_cliente(cliente_id, db, user) if cliente_id else None
    poliza = get_scoped_poliza(poliza_id, db, user) if poliza_id else None
    if cliente and poliza and poliza.cliente_id != cliente.id:
        raise HTTPException(status_code=422, detail="La poliza no pertenece al cliente indicado")


@router.get("", response_model=list[TareaOut])
def list_tareas(
    completada: Optional[bool] = Query(default=None),
    fecha_vencimiento_hasta: Optional[date] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    poliza_id: Optional[int] = Query(default=None),
    asignada_a: Optional[int] = Query(default=None),
    tipo: Optional[str] = Query(default=None),
    prioridad: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = scoped_tarea_query(db, current_user)
    if completada is not None:
        query = query.filter(Tarea.completada == completada)
    if fecha_vencimiento_hasta:
        query = query.filter(Tarea.fecha_vencimiento <= fecha_vencimiento_hasta)
    if cliente_id:
        query = query.filter(Tarea.cliente_id == cliente_id)
    if poliza_id:
        query = query.filter(Tarea.poliza_id == poliza_id)
    if asignada_a and current_user.rol == "admin":
        query = query.filter(Tarea.asignada_a == asignada_a)
    if tipo:
        query = query.filter(Tarea.tipo == tipo)
    if prioridad:
        query = query.filter(Tarea.prioridad == prioridad)
    return query.order_by(Tarea.completada.asc(), Tarea.fecha_vencimiento.asc(), Tarea.prioridad.asc()).all()


@router.post("", response_model=TareaOut, status_code=status.HTTP_201_CREATED)
def create_tarea(
    data: TareaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    validate_links(data.cliente_id, data.poliza_id, db, current_user)
    tarea = Tarea(
        **data.model_dump(exclude={"asignada_a"}),
        asignada_a=resolve_assignee(data.asignada_a, db, current_user),
    )
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return get_scoped_tarea(tarea.id, db, current_user)


@router.put("/{tarea_id}", response_model=TareaOut)
def update_tarea(
    tarea_id: int,
    data: TareaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    tarea = get_scoped_tarea(tarea_id, db, current_user)
    payload = data.model_dump(exclude_unset=True)

    if "cliente_id" in payload or "poliza_id" in payload:
        validate_links(
            payload.get("cliente_id", tarea.cliente_id),
            payload.get("poliza_id", tarea.poliza_id),
            db,
            current_user,
        )
    if "asignada_a" in payload:
        payload["asignada_a"] = resolve_assignee(payload["asignada_a"], db, current_user)
    if "completada" in payload:
        tarea.completada_en = datetime.utcnow() if payload["completada"] else None

    for field, value in payload.items():
        setattr(tarea, field, value)

    db.commit()
    db.refresh(tarea)
    return get_scoped_tarea(tarea.id, db, current_user)


@router.delete("/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tarea(
    tarea_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    tarea = get_scoped_tarea(tarea_id, db, current_user)
    db.delete(tarea)
    db.commit()
