import smtplib
import time
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import litellm

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models.config import ConfigAlertas, ConfigLLM, ConfigPresupuesto
from app.models.usuario import Usuario
from app.schemas.config import (
    ConfigAlertasOut,
    ConfigAlertasUpdate,
    ConfigLLMOut,
    ConfigLLMUpdate,
    ConfigPresupuestoOut,
    ConfigPresupuestoUpdate,
    ConfigTestOut,
)
from app.services.crypto import decrypt, encrypt
from app.services.llm import build_model_id

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/llm", response_model=ConfigLLMOut)
def get_llm_config(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    config = db.query(ConfigLLM).filter(ConfigLLM.activo == True).first() or db.query(ConfigLLM).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuracion LLM no encontrada")
    return llm_out(config)


@router.put("/llm", response_model=ConfigLLMOut)
def update_llm_config(
    data: ConfigLLMUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    config = db.query(ConfigLLM).first()
    if not config:
        config = ConfigLLM(proveedor=data.proveedor, modelo=data.modelo)
        db.add(config)

    config.proveedor = data.proveedor
    config.modelo = data.modelo
    config.temperatura = data.temperatura
    config.activo = data.activo
    if data.api_key and data.api_key != "***":
        config.api_key_cifrada = encrypt(data.api_key)

    db.commit()
    db.refresh(config)
    return llm_out(config)


@router.post("/llm/test", response_model=ConfigTestOut)
async def test_llm_config(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    config = db.query(ConfigLLM).filter(ConfigLLM.activo == True).first() or db.query(ConfigLLM).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuracion LLM no encontrada")

    try:
        api_key = decrypt(config.api_key_cifrada) if config.api_key_cifrada else None
        started = time.perf_counter()
        response = await litellm.acompletion(
            model=build_model_id(config),
            messages=[{"role": "user", "content": "Responde solamente: ok"}],
            temperature=0,
            api_key=api_key,
        )
        _ = response.choices[0].message.content
        latency_ms = int((time.perf_counter() - started) * 1000)
        return ConfigTestOut(ok=True, modelo=build_model_id(config), latency_ms=latency_ms)
    except Exception as exc:
        return ConfigTestOut(ok=False, modelo=build_model_id(config), error=str(exc)[:300])


@router.get("/alertas", response_model=ConfigAlertasOut)
def get_alertas_config(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    config = get_or_create_alertas(db)
    return alertas_out(config)


@router.put("/alertas", response_model=ConfigAlertasOut)
def update_alertas_config(
    data: ConfigAlertasUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    config = get_or_create_alertas(db)
    config.dias_anticipacion = sorted(set(data.dias_anticipacion), reverse=True)
    config.email_agente_activo = data.email_agente_activo
    config.email_cliente_activo = data.email_cliente_activo
    config.email_agente = data.email_agente
    config.smtp_host = data.smtp_host
    config.smtp_port = data.smtp_port
    config.smtp_user = data.smtp_user
    config.smtp_from_name = data.smtp_from_name
    if data.smtp_password and data.smtp_password != "***":
        config.smtp_password_cifrada = encrypt(data.smtp_password)
    db.commit()
    db.refresh(config)
    return alertas_out(config)


@router.post("/alertas/test-email", response_model=ConfigTestOut)
def test_alertas_email(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    config = get_or_create_alertas(db)
    if not config.email_agente:
        raise HTTPException(status_code=422, detail="Configura el email del agente antes de probar")
    if not config.smtp_host or not config.smtp_port:
        raise HTTPException(status_code=422, detail="Configura SMTP host y puerto antes de probar")

    try:
        started = time.perf_counter()
        message = EmailMessage()
        sender = config.smtp_user or config.email_agente
        message["From"] = f"{config.smtp_from_name or 'Control de Polizas'} <{sender}>"
        message["To"] = config.email_agente
        message["Subject"] = "Prueba de alertas - Control de Polizas"
        message.set_content("Email de prueba enviado correctamente desde Control de Polizas.")
        password = decrypt(config.smtp_password_cifrada) if config.smtp_password_cifrada else None
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=20) as smtp:
            smtp.starttls()
            if config.smtp_user and password:
                smtp.login(config.smtp_user, password)
            smtp.send_message(message)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return ConfigTestOut(ok=True, modelo="smtp", latency_ms=latency_ms)
    except Exception as exc:
        return ConfigTestOut(ok=False, modelo="smtp", error=str(exc)[:300])


@router.get("/presupuesto", response_model=list[ConfigPresupuestoOut])
def list_presupuestos(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    ensure_default_presupuestos(db)
    return db.query(ConfigPresupuesto).order_by(ConfigPresupuesto.proveedor.asc()).all()


@router.put("/presupuesto/{proveedor}", response_model=ConfigPresupuestoOut)
def update_presupuesto(
    proveedor: str,
    data: ConfigPresupuestoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    presupuesto = db.query(ConfigPresupuesto).filter(ConfigPresupuesto.proveedor == proveedor).first()
    if not presupuesto:
        presupuesto = ConfigPresupuesto(proveedor=proveedor)
        db.add(presupuesto)
    presupuesto.presupuesto_mensual_usd = data.presupuesto_mensual_usd
    presupuesto.alerta_porcentaje = data.alerta_porcentaje
    presupuesto.alerta_activa = False
    db.commit()
    db.refresh(presupuesto)
    return presupuesto


def get_or_create_alertas(db: Session) -> ConfigAlertas:
    config = db.query(ConfigAlertas).first()
    if not config:
        config = ConfigAlertas()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def ensure_default_presupuestos(db: Session) -> None:
    for proveedor in ["anthropic", "openai", "google", "deepseek"]:
        if not db.query(ConfigPresupuesto).filter(ConfigPresupuesto.proveedor == proveedor).first():
            db.add(ConfigPresupuesto(proveedor=proveedor, presupuesto_mensual_usd=50, alerta_porcentaje=80))
    db.commit()


def llm_out(config: ConfigLLM) -> ConfigLLMOut:
    return ConfigLLMOut(
        id=config.id,
        proveedor=config.proveedor,
        modelo=config.modelo,
        api_key_masked=mask_secret(config.api_key_cifrada),
        temperatura=config.temperatura,
        activo=config.activo,
    )


def alertas_out(config: ConfigAlertas) -> ConfigAlertasOut:
    return ConfigAlertasOut(
        id=config.id,
        dias_anticipacion=config.dias_anticipacion or [60, 30, 15, 7],
        email_agente_activo=config.email_agente_activo,
        email_cliente_activo=config.email_cliente_activo,
        email_agente=config.email_agente,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        smtp_password_masked=mask_secret(config.smtp_password_cifrada),
        smtp_from_name=config.smtp_from_name,
    )


def mask_secret(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return None
    try:
        plain = decrypt(ciphertext)
    except Exception:
        return "***"
    return f"***{plain[-4:]}" if len(plain) >= 4 else "***"
