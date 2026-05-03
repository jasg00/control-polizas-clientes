from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, index=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    rfc = Column(String, nullable=True, index=True)
    curp = Column(String, nullable=True)
    direccion = Column(Text, nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    notas = Column(Text, nullable=True)
    agente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agente = relationship("Usuario", back_populates="clientes")
    polizas = relationship("Poliza", back_populates="cliente")
    documentos = relationship("Documento", back_populates="cliente")
    tareas = relationship("Tarea", back_populates="cliente")
