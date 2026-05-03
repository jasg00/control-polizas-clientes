from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    nombre_original = Column(String, nullable=False)
    tipo = Column(String, nullable=False, index=True)
    ruta_archivo = Column(String, nullable=False)
    tamano_bytes = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    poliza_id = Column(Integer, ForeignKey("polizas.id"), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    subido_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    poliza = relationship("Poliza", back_populates="documentos")
    cliente = relationship("Cliente", back_populates="documentos")
    usuario = relationship("Usuario", back_populates="documentos_subidos")
