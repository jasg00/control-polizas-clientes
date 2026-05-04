"""
Create or reset the local admin user.

Usage:
  python seed_admin.py
  python seed_admin.py --reset

Optional environment variables:
  ADMIN_NOMBRE
  ADMIN_EMAIL
  ADMIN_PASSWORD
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.services.auth import hash_password

DEFAULT_ADMIN_NOMBRE = "Administrador"
DEFAULT_ADMIN_EMAIL = "admin@polizas.local"
DEFAULT_ADMIN_PASSWORD = "Admin1234!"


def admin_values():
    return {
        "nombre": os.getenv("ADMIN_NOMBRE", DEFAULT_ADMIN_NOMBRE),
        "email": os.getenv("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL),
        "password": os.getenv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD),
    }


def seed(reset: bool = False):
    values = admin_values()
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.email == values["email"]).first()
        if existing:
            if not reset:
                print(f"Admin already exists: {values['email']}")
                return
            existing.nombre = values["nombre"]
            existing.password_hash = hash_password(values["password"])
            existing.rol = "admin"
            existing.activo = True
            db.commit()
            print(f"Admin password reset: {values['email']} / {values['password']}")
            return

        admin = Usuario(
            nombre=values["nombre"],
            email=values["email"],
            password_hash=hash_password(values["password"]),
            rol="admin",
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {values['email']} / {values['password']}")
        print("IMPORTANT: Change this password after the first login.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the admin password and reactivate the account")
    args = parser.parse_args()
    seed(reset=args.reset)
