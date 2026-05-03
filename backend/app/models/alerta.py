from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class AlertaEnviada(Base):
    __tablename__ = "alertas_enviadas"

    id = Column(Integer, primary_key=True, index=True)
    poliza_id = Column(Integer, ForeignKey("polizas.id"), nullable=False, index=True)
    dias_antes = Column(Integer, nullable=False, index=True)
    canal = Column(String, nullable=False, default="email")
    destinatario = Column(String, nullable=False)
    enviada_en = Column(DateTime, default=datetime.utcnow)

    poliza = relationship("Poliza", back_populates="alertas_enviadas")
