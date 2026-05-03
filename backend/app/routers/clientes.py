from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.cliente import (
    ClienteCreate,
    ClienteOut,
    ClienteUpdate,
    ClienteWithPolizas,
    cliente_to_detail,
    cliente_to_out,
)

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


def scoped_cliente_query(db: Session, user: Usuario):
    query = db.query(Cliente)
    if user.rol != "admin":
        query = query.filter(Cliente.agente_id == user.id)
    return query


def get_scoped_cliente(cliente_id: int, db: Session, user: Usuario) -> Cliente:
    cliente = (
        scoped_cliente_query(db, user)
        .options(selectinload(Cliente.polizas))
        .filter(Cliente.id == cliente_id)
        .first()
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.get("", response_model=List[ClienteOut])
def list_clientes(
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = scoped_cliente_query(db, current_user).options(selectinload(Cliente.polizas))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Cliente.nombre.ilike(term),
                Cliente.email.ilike(term),
                Cliente.rfc.ilike(term),
            )
        )
    clientes = query.order_by(Cliente.nombre).all()
    return [cliente_to_out(cliente) for cliente in clientes]


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def create_cliente(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = Cliente(**data.model_dump(), agente_id=current_user.id)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente_to_out(cliente)


@router.get("/{cliente_id}", response_model=ClienteWithPolizas)
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = get_scoped_cliente(cliente_id, db, current_user)
    return cliente_to_detail(cliente)


@router.put("/{cliente_id}", response_model=ClienteOut)
def update_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = get_scoped_cliente(cliente_id, db, current_user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    db.commit()
    db.refresh(cliente)
    return cliente_to_out(cliente)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = get_scoped_cliente(cliente_id, db, current_user)
    for poliza in list(cliente.polizas):
        db.delete(poliza)
    db.delete(cliente)
    db.commit()
