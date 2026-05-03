from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import get_settings

settings = get_settings()
_scheduler = AsyncIOScheduler()


def start_scheduler():
    if not _scheduler.running:
        # Alert job will be added in Module 6
        # _scheduler.add_job(procesar_alertas_job, "cron", hour=settings.alert_hour)
        _scheduler.start()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
