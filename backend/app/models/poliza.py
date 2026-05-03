from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Poliza(Base):
    __tablename__ = "polizas"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, nullable=False, index=True)
    tipo = Column(String, nullable=False, index=True)
    aseguradora = Column(String, nullable=False, index=True)
    plan = Column(String, nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False, index=True)
    prima = Column(Numeric(10, 2), nullable=False)
    moneda = Column(String, nullable=False, default="MXN")
    periodo_gracia_dias = Column(Integer, nullable=False, default=0)
    estatus = Column(String, nullable=False, default="activa", index=True)
    porcentaje_comision = Column(Numeric(5, 4), nullable=False, default=0)
    monto_comision = Column(Numeric(10, 2), nullable=False, default=0)
    comision_pagada = Column(Boolean, nullable=False, default=False)
    detalles = Column(JSON, nullable=True)
    notas = Column(Text, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    agente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, index=True)

    cliente = relationship("Cliente", back_populates="polizas")
    agente = relationship("Usuario", back_populates="polizas")
    documentos = relationship("Documento", back_populates="poliza")
    tareas = relationship("Tarea", back_populates="poliza")
    alertas_enviadas = relationship("AlertaEnviada", back_populates="poliza")
