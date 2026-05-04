from datetime import datetime

from pydantic import BaseModel

from app.schemas.poliza import PolizaSummary


class AlertaEnviadaOut(BaseModel):
    id: int
    poliza_id: int
    dias_antes: int
    canal: str
    destinatario: str
    enviada_en: datetime

    model_config = {"from_attributes": True}


class AlertasProximasOut(BaseModel):
    urgente: list[PolizaSummary]
    pronto: list[PolizaSummary]
    este_mes: list[PolizaSummary]
    proximo_bimestre: list[PolizaSummary]
