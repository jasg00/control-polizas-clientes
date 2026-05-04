from datetime import datetime, timedelta
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import get_settings
from app.database import SessionLocal

settings = get_settings()
_scheduler = AsyncIOScheduler()
TEMP_UPLOADS_DIR = Path("uploads/temp")


def start_scheduler():
    if not _scheduler.running:
        _scheduler.add_job(clean_temp_uploads, "interval", minutes=30, id="clean_temp_uploads", replace_existing=True)
        _scheduler.add_job(procesar_alertas_job, "cron", hour=settings.alert_hour, id="procesar_alertas", replace_existing=True)
        _scheduler.start()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


def clean_temp_uploads(max_age_minutes: int = 60) -> int:
    if not TEMP_UPLOADS_DIR.exists():
        return 0

    cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
    deleted = 0
    for path in TEMP_UPLOADS_DIR.glob("*"):
        if not path.is_file():
            continue
        modified_at = datetime.utcfromtimestamp(path.stat().st_mtime)
        if modified_at < cutoff:
            path.unlink(missing_ok=True)
            deleted += 1
    return deleted


def procesar_alertas_job() -> int:
    from app.services.alertas import procesar_alertas

    db = SessionLocal()
    try:
        return procesar_alertas(db)
    finally:
        db.close()
