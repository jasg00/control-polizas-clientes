from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Tarea(Base):
    __tablename__ = "tareas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo = Column(String, nullable=False, index=True)
    prioridad = Column(String, nullable=False, default="media", index=True)
    fecha_vencimiento = Column(Date, nullable=False, index=True)
    completada = Column(Boolean, nullable=False, default=False, index=True)
    completada_en = Column(DateTime, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    poliza_id = Column(Integer, ForeignKey("polizas.id"), nullable=True, index=True)
    asignada_a = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cliente = relationship("Cliente", back_populates="tareas")
    poliza = relationship("Poliza", back_populates="tareas")
    usuario_asignado = relationship("Usuario", back_populates="tareas_asignadas")
