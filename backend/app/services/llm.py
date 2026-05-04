import json
import re
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

import litellm
from litellm import completion_cost

from app.models.config import ConfigLLM, ConfigPresupuesto
from app.models.llm_log import LLMCallLog
from app.services.crypto import decrypt

OCR_PROMPT_TEMPLATE = """Eres un extractor de datos de pólizas de seguros mexicanas.
Del siguiente texto de una carátula de póliza, extrae estos campos y devuelve
ÚNICAMENTE un JSON válido. Para cada campo incluye el valor y un nivel de confianza
entre 0 y 1 (1 = muy seguro, 0 = no encontrado).

Formato de respuesta:
{{
  "numero": {{"valor": "...", "confianza": 0.0}},
  "aseguradora": {{"valor": "...", "confianza": 0.0}},
  "tipo": {{"valor": "auto|vida|hogar|gmm|empresarial|viaje|danos|obra_civil", "confianza": 0.0}},
  "fecha_inicio": {{"valor": "YYYY-MM-DD", "confianza": 0.0}},
  "fecha_fin": {{"valor": "YYYY-MM-DD", "confianza": 0.0}},
  "prima": {{"valor": 0.0, "confianza": 0.0}},
  "moneda": {{"valor": "MXN|USD", "confianza": 0.0}},
  "plan": {{"valor": "...", "confianza": 0.0}},
  "detalles": {{"valor": {{}}, "confianza": 0.0}}
}}

Usa null como valor si no encuentras el dato. Nunca inventes datos.
Texto de la póliza:
{text}"""


def get_active_config(db: Session) -> ConfigLLM:
    config = db.query(ConfigLLM).filter(ConfigLLM.activo == True).first()
    if not config:
        raise HTTPException(status_code=503, detail="No hay configuracion de IA activa. Configura un proveedor en Ajustes.")
    return config


def build_model_id(config: ConfigLLM) -> str:
    mapping = {
        "anthropic": f"anthropic/{config.modelo}",
        "openai": f"openai/{config.modelo}",
        "google": f"gemini/{config.modelo}",
        "deepseek": f"deepseek/{config.modelo}",
    }
    return mapping.get(config.proveedor, config.modelo)


def _monthly_spend(db: Session, proveedor: str) -> Decimal:
    now = datetime.utcnow()
    total = db.query(func.sum(LLMCallLog.costo_usd)).filter(
        LLMCallLog.proveedor == proveedor,
        LLMCallLog.exito == True,
        extract("year", LLMCallLog.created_at) == now.year,
        extract("month", LLMCallLog.created_at) == now.month,
    ).scalar()
    return Decimal(total or 0)


def _ensure_budget_available(db: Session, proveedor: str) -> None:
    presupuesto = db.query(ConfigPresupuesto).filter(ConfigPresupuesto.proveedor == proveedor).first()
    if not presupuesto:
        return

    if _monthly_spend(db, proveedor) >= Decimal(presupuesto.presupuesto_mensual_usd):
        raise HTTPException(status_code=402, detail="Presupuesto mensual de IA agotado")


async def call_llm(
    messages: list,
    db: Session,
    usuario_id: int,
    operacion: str,
) -> tuple[str, LLMCallLog]:
    config = get_active_config(db)
    model_id = build_model_id(config)
    _ensure_budget_available(db, config.proveedor)

    api_key = None
    if config.api_key_cifrada:
        api_key = decrypt(config.api_key_cifrada)

    log = LLMCallLog(
        usuario_id=usuario_id,
        proveedor=config.proveedor,
        modelo=config.modelo,
        operacion=operacion,
        exito=False,
    )

    try:
        response = await litellm.acompletion(
            model=model_id,
            messages=messages,
            temperature=config.temperatura,
            api_key=api_key,
        )

        usage = getattr(response, "usage", None)
        cost = float(completion_cost(completion_response=response) or 0)
        log.input_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
        log.output_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
        log.costo_usd = cost
        log.exito = True

        db.add(log)
        db.commit()
        db.refresh(log)

        _check_budget(db, config.proveedor)

        return response.choices[0].message.content, log

    except HTTPException:
        raise
    except Exception as exc:
        log.error_msg = str(exc)[:500]
        db.add(log)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Error de IA: {exc}")


def _check_budget(db: Session, proveedor: str) -> None:
    presupuesto = db.query(ConfigPresupuesto).filter(ConfigPresupuesto.proveedor == proveedor).first()
    if not presupuesto:
        return

    monthly_total = _monthly_spend(db, proveedor)

    budget = Decimal(presupuesto.presupuesto_mensual_usd)
    threshold = budget * Decimal(presupuesto.alerta_porcentaje) / Decimal(100)

    if monthly_total >= threshold and not presupuesto.alerta_activa:
        presupuesto.alerta_activa = True
        db.commit()


async def extract_poliza(text: str, db: Session, usuario_id: int) -> dict:
    prompt = OCR_PROMPT_TEMPLATE.format(text=text)
    content, log = await call_llm(
        messages=[{"role": "user", "content": prompt}],
        db=db,
        usuario_id=usuario_id,
        operacion="ocr",
    )

    match = re.search(r"\{.*\}", content, re.DOTALL)
    raw = match.group() if match else content
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="La IA no devolvio JSON valido")

    result["llm_log_id"] = log.id
    return result
