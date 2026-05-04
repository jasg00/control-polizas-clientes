import smtplib
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.alerta import AlertaEnviada
from app.models.config import ConfigAlertas
from app.models.poliza import Poliza
from app.services.crypto import decrypt


def calcular_estatus(poliza: Poliza) -> str:
    if poliza.estatus == "cancelada":
        return "cancelada"

    today = date.today()
    grace_until = poliza.fecha_fin + timedelta(days=poliza.periodo_gracia_dias or 0)
    if today > grace_until:
        return "vencida"
    if (poliza.fecha_fin - today).days <= 30:
        return "por_vencer"
    return "activa"


def update_estatus_polizas(db: Session) -> int:
    polizas = db.query(Poliza).filter(Poliza.deleted_at.is_(None)).all()
    changed = 0
    for poliza in polizas:
        next_status = calcular_estatus(poliza)
        if poliza.estatus != next_status:
            poliza.estatus = next_status
            changed += 1
    if changed:
        db.commit()
    return changed


def get_polizas_proximas_vencer(db: Session, dias_max: int = 60) -> list[Poliza]:
    update_estatus_polizas(db)
    today = date.today()
    return (
        db.query(Poliza)
        .options(joinedload(Poliza.cliente))
        .filter(
            Poliza.deleted_at.is_(None),
            Poliza.estatus.in_(["activa", "por_vencer"]),
            Poliza.fecha_fin >= today,
            Poliza.fecha_fin <= today + timedelta(days=dias_max),
        )
        .order_by(Poliza.fecha_fin.asc(), Poliza.numero.asc())
        .all()
    )


def bucket_polizas(polizas: Iterable[Poliza]) -> dict[str, list[Poliza]]:
    buckets: dict[str, list[Poliza]] = {
        "urgente": [],
        "pronto": [],
        "este_mes": [],
        "proximo_bimestre": [],
    }
    today = date.today()
    for poliza in polizas:
        dias = (poliza.fecha_fin - today).days
        if dias <= 7:
            buckets["urgente"].append(poliza)
        elif dias <= 15:
            buckets["pronto"].append(poliza)
        elif dias <= 30:
            buckets["este_mes"].append(poliza)
        elif dias <= 60:
            buckets["proximo_bimestre"].append(poliza)
    return buckets


def ya_enviada(db: Session, poliza_id: int, dias_antes: int, canal: str = "email") -> bool:
    return (
        db.query(AlertaEnviada)
        .filter(
            AlertaEnviada.poliza_id == poliza_id,
            AlertaEnviada.dias_antes == dias_antes,
            AlertaEnviada.canal == canal,
        )
        .first()
        is not None
    )


def enviar_alerta_email(poliza: Poliza, dias_antes: int, config: ConfigAlertas, destinatario: str) -> None:
    if not config.smtp_host or not config.smtp_port:
        raise HTTPException(status_code=503, detail="SMTP no configurado")

    message = EmailMessage()
    sender_name = config.smtp_from_name or "Control de Polizas"
    sender = config.smtp_user or destinatario
    message["From"] = f"{sender_name} <{sender}>"
    message["To"] = destinatario
    message["Subject"] = f"AVISO: Poliza #{poliza.numero} vence en {dias_antes} dias"
    message.set_content(
        "\n".join(
            [
                f"La poliza {poliza.numero} de {poliza.aseguradora} vence en {dias_antes} dias.",
                f"Cliente: {poliza.cliente.nombre if poliza.cliente else '-'}",
                f"Vence el: {poliza.fecha_fin.isoformat()}",
                "",
                "Ingresa al sistema para revisar la renovacion.",
            ]
        )
    )
    message.add_alternative(
        f"""
        <html>
          <body>
            <h2>Poliza por vencer</h2>
            <p>La poliza <strong>{poliza.numero}</strong> de <strong>{poliza.aseguradora}</strong> vence en <strong>{dias_antes} dias</strong>.</p>
            <p>Cliente: {poliza.cliente.nombre if poliza.cliente else '-'}</p>
            <p>Fecha de vencimiento: {poliza.fecha_fin.isoformat()}</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    password = None
    if config.smtp_password_cifrada:
        password = decrypt(config.smtp_password_cifrada)

    with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=20) as smtp:
        smtp.starttls()
        if config.smtp_user and password:
            smtp.login(config.smtp_user, password)
        smtp.send_message(message)


def registrar_alerta(db: Session, poliza: Poliza, dias_antes: int, canal: str, destinatario: str) -> AlertaEnviada:
    alerta = AlertaEnviada(
        poliza_id=poliza.id,
        dias_antes=dias_antes,
        canal=canal,
        destinatario=destinatario,
        enviada_en=datetime.utcnow(),
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)
    return alerta


def procesar_alertas(db: Session) -> int:
    update_estatus_polizas(db)
    config = db.query(ConfigAlertas).first()
    if not config:
        return 0

    sent = 0
    today = date.today()
    polizas = get_polizas_proximas_vencer(db, max(config.dias_anticipacion or [60]))
    for poliza in polizas:
        dias = (poliza.fecha_fin - today).days
        if dias not in (config.dias_anticipacion or []):
            continue
        if ya_enviada(db, poliza.id, dias):
            continue
        for destinatario in destinatarios_alerta(poliza, config):
            enviar_alerta_email(poliza, dias, config, destinatario)
            registrar_alerta(db, poliza, dias, "email", destinatario)
            sent += 1
    return sent


def destinatarios_alerta(poliza: Poliza, config: ConfigAlertas) -> list[str]:
    destinatarios: list[str] = []
    if config.email_agente_activo and config.email_agente:
        destinatarios.append(config.email_agente)
    if config.email_cliente_activo and poliza.cliente and poliza.cliente.email:
        destinatarios.append(poliza.cliente.email)
    return destinatarios
