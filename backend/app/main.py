from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    ensure_default_configs()
    from app.services.scheduler import start_scheduler
    start_scheduler()
    yield
    # Shutdown
    from app.services.scheduler import stop_scheduler
    stop_scheduler()


app = FastAPI(
    title="Sistema de Pólizas y Clientes",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


from app.routers import alertas, auth, clientes, config, dashboard, documentos, ocr, polizas, reportes, tareas, usuarios

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clientes.router)
app.include_router(polizas.router)
app.include_router(documentos.router)
app.include_router(alertas.router)
app.include_router(tareas.router)
app.include_router(dashboard.router)
app.include_router(reportes.router)
app.include_router(config.router)
app.include_router(ocr.router)
# Additional routers added as modules are completed


def ensure_default_configs():
    from app.database import SessionLocal
    from app.models.config import ConfigAlertas, ConfigPresupuesto

    db = SessionLocal()
    try:
        if not db.query(ConfigAlertas).first():
            db.add(ConfigAlertas())
        for proveedor in ["anthropic", "openai", "google", "deepseek"]:
            if not db.query(ConfigPresupuesto).filter(ConfigPresupuesto.proveedor == proveedor).first():
                db.add(ConfigPresupuesto(proveedor=proveedor, presupuesto_mensual_usd=50, alerta_porcentaje=80))
        db.commit()
    finally:
        db.close()
