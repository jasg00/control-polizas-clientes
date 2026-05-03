from sqlalchemy import Boolean, Column, Float, Integer, JSON, Numeric, String

from app.database import Base


class ConfigLLM(Base):
    __tablename__ = "config_llm"

    id = Column(Integer, primary_key=True, index=True)
    proveedor = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    api_key_cifrada = Column(String, nullable=True)
    temperatura = Column(Float, nullable=False, default=0.1)
    activo = Column(Boolean, nullable=False, default=True)


class ConfigAlertas(Base):
    __tablename__ = "config_alertas"

    id = Column(Integer, primary_key=True, index=True)
    dias_anticipacion = Column(JSON, nullable=False, default=lambda: [60, 30, 15, 7])
    email_agente_activo = Column(Boolean, nullable=False, default=True)
    email_cliente_activo = Column(Boolean, nullable=False, default=False)
    email_agente = Column(String, nullable=True)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_user = Column(String, nullable=True)
    smtp_password_cifrada = Column(String, nullable=True)
    smtp_from_name = Column(String, nullable=True)


class ConfigPresupuesto(Base):
    __tablename__ = "config_presupuestos"

    id = Column(Integer, primary_key=True, index=True)
    proveedor = Column(String, nullable=False, unique=True, index=True)
    presupuesto_mensual_usd = Column(Numeric(8, 2), nullable=False)
    alerta_porcentaje = Column(Integer, nullable=False, default=80)
    alerta_activa = Column(Boolean, nullable=False, default=False)
