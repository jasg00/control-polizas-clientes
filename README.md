# Sistema de Control de Polizas y Clientes

Aplicacion local para administrar clientes, usuarios y, por modulos, polizas de seguros.

## Inicio rapido

1. Abre una terminal en la carpeta del proyecto.

2. Inicia backend y frontend:

   ```bat
   polizas.bat
   ```

   El script inicia FastAPI y Vite, guarda logs en `.runtime/` y abre la app.

3. Entra a la app:

   ```text
   http://127.0.0.1:5174
   ```

4. Inicia sesion con el usuario seed:

   ```text
   admin@polizas.local
   Admin1234!
   ```

5. Para detener todo:

   ```bat
   polizas.bat stop
   ```

## Comandos utiles

```bat
polizas.bat start
polizas.bat stop
polizas.bat restart
polizas.bat status
polizas.bat open
polizas.bat open api
polizas.bat logs
polizas.bat logs backend
polizas.bat logs frontend
```

## URLs locales

- Frontend: `http://127.0.0.1:5174`
- Backend API docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

El puerto frontend por defecto del proyecto es `5174` porque `5173` suele estar ocupado en esta maquina. Puedes cambiarlo temporalmente asi:

```bat
set FRONTEND_PORT=5173
polizas.bat start
```

## Ejecutar manualmente

Backend:

```bat
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```bat
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

## Verificacion

Backend:

```bat
cd backend
venv\Scripts\python.exe -m compileall app
```

Frontend:

```bat
cd frontend
npm.cmd run build
```
