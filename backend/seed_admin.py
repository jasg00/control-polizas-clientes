"""
Run once to create the initial admin user:
  python seed_admin.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.services.auth import hash_password

ADMIN_NOMBRE = "Administrador"
ADMIN_EMAIL = "admin@polizas.local"
ADMIN_PASSWORD = "Admin1234!"


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin ya existe: {ADMIN_EMAIL}")
            return
        admin = Usuario(
            nombre=ADMIN_NOMBRE,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            rol="admin",
        )
        db.add(admin)
        db.commit()
        print(f"Admin creado: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("IMPORTANTE: Cambia la contraseña después del primer inicio de sesión.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
