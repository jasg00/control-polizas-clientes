from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, nullable=False, default="agente")  # admin | agente
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clientes = relationship("Cliente", back_populates="agente")
    polizas = relationship("Poliza", back_populates="agente")
    documentos_subidos = relationship("Documento", back_populates="usuario")
    tareas_asignadas = relationship("Tarea", back_populates="usuario_asignado")
    llm_logs = relationship("LLMCallLog", back_populates="usuario")
