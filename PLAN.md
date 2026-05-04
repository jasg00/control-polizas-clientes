# Sistema de Control de Pólizas y Clientes — Implementation Tracker

> **Legend:** `[ ]` = pending · `[x]` = done · `[~]` = in progress · `[-]` = skipped/deferred
>
> **Stack:** FastAPI (Python) backend · React + Vite (TypeScript) frontend · SQLite→PostgreSQL · LiteLLM · APScheduler · JWT auth · Tailwind + shadcn/ui

---

## MODULE 0 — Project Setup & Infrastructure

### 0.1 Repository & Folder Structure
- [x] Create root folder with `backend/` and `frontend/` subfolders
- [x] Add `.gitignore` for Python venv, node_modules, .env, uploads/, *.db
- [x] Create root `README.md` with quick-start instructions

### 0.2 Backend — Python / FastAPI
- [x] Create `backend/` Python virtual environment (Python 3.11)
- [x] Create `backend/requirements.txt` with all dependencies
- [x] Create `backend/app/__init__.py`
- [x] Create `backend/app/main.py` — FastAPI app, CORS, lifespan scheduler
- [x] Create `backend/app/database.py` — SQLAlchemy engine, SessionLocal, Base, get_db
- [x] Create `backend/app/config.py` — Pydantic Settings from .env
- [x] Create `backend/.env.example` and generated `.env` with real keys
- [x] Create `backend/uploads/.gitkeep`
- [x] Create `backend/alembic.ini` and init alembic
- [x] Configure `alembic/env.py` with Base metadata and DATABASE_URL from env

### 0.3 Frontend — React / Vite
- [x] Scaffold: `npm create vite@latest frontend -- --template react-ts`
- [x] Install: axios, react-router-dom, zustand, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, date-fns
- [x] Install Tailwind v4 (@tailwindcss/vite), class-variance-authority, clsx, tailwind-merge, lucide-react
- [x] Configure `vite.config.ts` proxy: `/api` → `http://localhost:8000` + `@` path alias
- [x] Configure `src/index.css` with Tailwind import + CSS variables
- [x] Create `components.json` for shadcn/ui
- [x] Create `frontend/src/types/models.ts` — all TypeScript interfaces
- [x] Create `frontend/src/api/client.ts` — Axios + JWT interceptor + 401/refresh logic
- [x] Create `frontend/src/store/authStore.ts` — Zustand persisted auth store
- [x] Create `frontend/src/router.tsx` — React Router v6 with all routes + ProtectedRoute
- [x] Create `frontend/src/lib/utils.ts` — cn() helper
- [x] Create `frontend/src/components/auth/ProtectedRoute.tsx`
- [x] Create `frontend/src/components/auth/RoleGuard.tsx`

### 0.4 Verification
- [x] `uvicorn app.main:app --reload` starts at port 8000; `/api/health` returns `{status: ok}`
- [x] Frontend builds with `npm run build` — 0 TypeScript errors
- [x] `npm run dev` / `polizas.bat` → browser opens `http://127.0.0.1:5174` → redirects to `/login` when unauthenticated

---

## MODULE 1 — Authentication & User Management (Security Foundation)

### 1.1 Backend — Models & Schemas
- [x] Create `backend/app/models/usuario.py`:
  ```python
  class Usuario(Base):
      id: int (PK)
      nombre: str
      email: str (unique, index)
      password_hash: str
      rol: str  # "admin" | "agente"
      activo: bool = True
      created_at: datetime
  ```
- [x] Create `backend/app/schemas/usuario.py`:
  - `UsuarioCreate(nombre, email, password, rol)`
  - `UsuarioOut(id, nombre, email, rol, activo, created_at)` — no password
  - `UsuarioUpdate(nombre?, email?, rol?, activo?)`
  - `LoginRequest(email, password)`
  - `TokenResponse(access_token, refresh_token, token_type, user: UsuarioOut)`
  - `RefreshRequest(refresh_token)`
- [x] Create first Alembic migration: `alembic revision --autogenerate -m "create_usuarios"`
- [x] Run migration: `alembic upgrade head`
- [x] Create admin seed script `backend/seed_admin.py` — creates one admin user if none exists

### 1.2 Backend — Auth Services & Dependencies
- [x] Create `backend/app/services/auth.py`:
  - `hash_password(plain: str) -> str` — bcrypt, cost 12
  - `verify_password(plain: str, hashed: str) -> bool`
  - `create_access_token(user_id: int, rol: str) -> str` — 60 min JWT
  - `create_refresh_token(user_id: int) -> str` — 7 day JWT
  - `decode_token(token: str) -> dict` — raises 401 if expired/invalid
- [x] Create `backend/app/dependencies/auth.py`:
  - `get_current_user(token: str = Depends(oauth2_scheme), db) -> Usuario` — decodes JWT, loads user from DB, raises 401 if inactive
  - `require_admin(user = Depends(get_current_user)) -> Usuario` — raises 403 if not admin

### 1.3 Backend — Auth Router
- [x] Create `backend/app/routers/auth.py`:
  - `POST /api/auth/login` — verify email+password, return `TokenResponse`
  - `POST /api/auth/refresh` — verify refresh token, return new `access_token`
  - `GET /api/auth/me` — returns current user info (requires auth)
- [x] Create `backend/app/routers/usuarios.py` (admin only):
  - `GET /api/usuarios` — list all users
  - `POST /api/usuarios` — create new agent (`require_admin`)
  - `GET /api/usuarios/{id}` — get user detail
  - `PUT /api/usuarios/{id}` — update name, email, role, active status (`require_admin`)
  - `DELETE /api/usuarios/{id}` — soft-delete (set `activo=False`) (`require_admin`)

### 1.4 Frontend — Auth
- [x] Create `frontend/src/pages/Login.tsx`:
  - Email + password form using react-hook-form + zod
  - On submit → POST `/api/auth/login` → store tokens + user in Zustand → redirect to `/`
  - Show error message on 401
- [x] Create `frontend/src/components/auth/ProtectedRoute.tsx`:
  - Read `accessToken` from Zustand
  - If null → redirect to `/login`
  - If token expiry is close → call refresh before rendering
- [x] Create `frontend/src/components/auth/RoleGuard.tsx`:
  - Props: `requiredRole: "admin" | "agente"`
  - Renders children only if `user.rol === requiredRole`; else renders `null` or fallback
- [x] Add logout button in top bar → clears Zustand store + redirects to `/login`

### 1.5 Frontend — Admin User Management Page
- [x] Create `frontend/src/pages/AdminUsuarios.tsx`:
  - Table of all users with columns: Nombre, Email, Rol, Activo, Acciones
  - "Nuevo agente" button → inline dialog form (nombre, email, password temporal, rol)
  - Toggle active/inactive per user
  - Wrapped in `<RoleGuard requiredRole="admin">`

### 1.6 Verification
- [ ] `POST /api/auth/login` with wrong password → 401
- [ ] `POST /api/auth/login` with correct credentials → returns access_token + refresh_token
- [ ] `GET /api/auth/me` without token → 401
- [ ] `GET /api/auth/me` with valid token → returns user object
- [ ] `POST /api/auth/refresh` with expired access token + valid refresh → new access token
- [ ] Admin creates new agente user; that user can log in; that user cannot access admin pages
- [ ] Agente cannot call `GET /api/usuarios` → 403

---

## MODULE 2 — Database Models (All Remaining Tables)

### 2.1 All Models
- [x] Create `backend/app/models/cliente.py`:
  ```python
  id, nombre, telefono, email, rfc, curp
  direccion, fecha_nacimiento, notas
  agente_id (FK → usuarios.id)
  created_at, updated_at
  ```
- [x] Create `backend/app/models/poliza.py`:
  ```python
  id, numero, tipo, aseguradora, plan
  fecha_inicio, fecha_fin (Date)
  prima (Numeric 10,2), moneda ("MXN"|"USD")
  periodo_gracia_dias (int, default 0)
  estatus ("activa"|"por_vencer"|"vencida"|"cancelada")
  porcentaje_comision (Numeric 5,4)  # e.g. 0.2000
  monto_comision (Numeric 10,2)      # prima * porcentaje, stored at creation
  comision_pagada (bool, default False)
  detalles (JSON)
  notas
  cliente_id (FK → clientes.id)
  agente_id (FK → usuarios.id)
  created_at, updated_at
  ```
- [x] Create `backend/app/models/documento.py`:
  ```python
  id, nombre_original, tipo, ruta_archivo
  tamaño_bytes, mime_type
  poliza_id (FK, nullable)
  cliente_id (FK, nullable)
  subido_por (FK → usuarios.id)
  created_at
  ```
- [x] Create `backend/app/models/tarea.py`:
  ```python
  id, titulo, descripcion, tipo, prioridad
  fecha_vencimiento (Date), completada (bool)
  cliente_id (FK, nullable)
  poliza_id (FK, nullable)
  asignada_a (FK → usuarios.id)
  created_at, updated_at
  ```
- [x] Create `backend/app/models/alerta.py`:
  ```python
  # AlertaEnviada — prevents duplicate sends
  id, poliza_id (FK), dias_antes (int)
  canal ("email"), destinatario, enviada_en (DateTime)
  ```
- [x] Create `backend/app/models/llm_log.py`:
  ```python
  id, usuario_id (FK), proveedor, modelo
  operacion ("ocr"|"test"|"otro")
  input_tokens (int), output_tokens (int)
  costo_usd (Numeric 10,6)
  exito (bool), error_msg
  created_at
  ```
- [x] Create `backend/app/models/config.py`:
  ```python
  class ConfigLLM(Base):
      id, proveedor, modelo
      api_key_cifrada, temperatura (float, default 0.1)
      activo (bool)
  
  class ConfigAlertas(Base):
      id
      dias_anticipacion (JSON, default [60,30,15,7])
      email_agente_activo (bool)
      email_cliente_activo (bool)
      smtp_host, smtp_port, smtp_user
      smtp_password_cifrada, smtp_from_name
  
  class ConfigPresupuesto(Base):
      id, proveedor
      presupuesto_mensual_usd (Numeric 8,2)
      alerta_porcentaje (int, default 80)
  ```
- [x] Create `backend/app/models/__init__.py` importing all models (needed for Alembic to detect them)
- [x] Generate and run Alembic migration: `alembic revision --autogenerate -m "create_all_tables"`
- [x] Run `alembic upgrade head` — verify all tables exist in DB

### 2.2 TypeScript Types
- [x] Update `frontend/src/types/models.ts` with interfaces for every model:
  - `Usuario`, `Cliente`, `Poliza`, `Documento`, `Tarea`
  - `AlertaEnviada`, `LLMCallLog`
  - `ConfigLLM`, `ConfigAlertas`, `ConfigPresupuesto`
  - `TipoPoliza` enum: `"auto"|"vida"|"hogar"|"gmm"|"empresarial"|"viaje"|"danos"|"obra_civil"`
  - `EstatusPoliza`, `RolUsuario`, `TipoTarea`, `PrioridadTarea`
  - `DetallesAuto`, `DetallesVida`, `DetallesHogar`, etc. for each policy type's JSON shape

---

## MODULE 3 — Clientes (Client Management)

### 3.1 Backend
- [x] Create `backend/app/schemas/cliente.py`:
  - `ClienteCreate(nombre, telefono?, email?, rfc?, curp?, direccion?, fecha_nacimiento?, notas?)`
  - `ClienteOut(+ id, agente_id, created_at, updated_at)`
  - `ClienteWithPolizas(+ polizas: list[PolizaSummary])`
  - `ClienteUpdate` — all fields optional
- [x] Create `backend/app/routers/clientes.py`:
  - `GET /api/clientes` — list; filter by `?q=` (search nombre/email/rfc); data isolation by `agente_id` unless admin
  - `POST /api/clientes` — create; sets `agente_id = current_user.id`
  - `GET /api/clientes/{id}` — returns `ClienteWithPolizas`; 404 if not found or wrong agent
  - `PUT /api/clientes/{id}` — update; verify ownership
  - `DELETE /api/clientes/{id}` — soft delete (add `deleted_at` field) or hard delete

### 3.2 Frontend — Client List
- [x] Create `frontend/src/api/clientes.ts` — `getClientes(q?)`, `getCliente(id)`, `createCliente(data)`, `updateCliente(id, data)`, `deleteCliente(id)`
- [x] Create `frontend/src/pages/Clientes.tsx`:
  - Search bar (debounced 300ms) — filters by nombre, RFC, email
  - Table: Nombre, Teléfono, Email, RFC, Pólizas activas, Acciones
  - "Nuevo cliente" button → opens dialog or navigates to `/clientes/nuevo`
  - Pagination (25 per page)
  - Empty state illustration + "Agrega tu primer cliente"

### 3.3 Frontend — Client Form
- [x] Create `frontend/src/components/clientes/ClienteForm.tsx`:
  - Fields: Nombre*, Teléfono, Email, RFC, CURP, Dirección, Fecha de nacimiento, Notas
  - Validation: email format, RFC format (13 chars), CURP format (18 chars)
  - Used both in create and edit flows

### 3.4 Frontend — Client Detail Page
- [x] Create `frontend/src/pages/ClienteDetalle.tsx`:
  - Header: client name, quick contact links (tel, email)
  - **Tab 1 — Información**: editable form (inline edit mode toggle)
  - **Tab 2 — Pólizas**: list of client's policies as cards with `VigenciaBadge`; "Nueva póliza" button pre-fills client
  - **Tab 3 — Tareas**: pending tasks for this client; "Nueva tarea" button
  - **Tab 4 — Documentos**: documents attached to this client or their policies

### 3.5 Verification
- [x] Create client → appears in list
- [x] Search by partial name → filters correctly
- [x] Agente A creates client → Agente B logs in and cannot see it in `GET /api/clientes`
- [x] Admin logs in → sees all clients from all agents
- [x] `GET /api/clientes/{id}` with wrong agent token → 403 or 404

---

## MODULE 4 — Pólizas (Policy Management)

### 4.1 Backend
- [x] Create `backend/app/schemas/poliza.py`:
  - `PolizaCreate(numero, tipo, aseguradora, plan?, fecha_inicio, fecha_fin, prima, moneda, periodo_gracia_dias?, porcentaje_comision?, detalles?, notas?, cliente_id)`
  - `PolizaOut` — full model including `cliente: ClienteOut`, `dias_restantes: int` (computed), `monto_comision: float`
  - `PolizaSummary` — lighter version for lists
  - `PolizaUpdate` — all fields optional
- [x] Add `dias_restantes` as computed property in `PolizaOut`:
  ```python
  @computed_field
  def dias_restantes(self) -> int:
      return max(0, (self.fecha_fin - date.today()).days)
  ```
- [x] Create `backend/app/routers/polizas.py`:
  - `GET /api/polizas` — list with filters: `?tipo=`, `?aseguradora=`, `?estatus=`, `?cliente_id=`, `?vence_en_dias=30`; data isolation
  - `POST /api/polizas` — create; auto-calculate `monto_comision = prima * porcentaje_comision`; set `agente_id`
  - `GET /api/polizas/{id}` — full detail; verify ownership
  - `PUT /api/polizas/{id}` — update; recalculate `monto_comision` if prima or porcentaje changed
  - `DELETE /api/polizas/{id}` — soft delete

### 4.2 Frontend — Dynamic Policy Form
- [x] Create `frontend/src/components/polizas/DetallesCampos.tsx`:
  - Props: `tipo: TipoPoliza`, `value: object`, `onChange: fn`
  - Renders the correct set of fields based on `tipo`:
    - **auto**: Marca, Modelo, Año, Placas, VIN, Suma asegurada, Tipo cobertura (Amplia/Limitada/RC)
    - **vida**: Suma asegurada, Tipo vida (Temporal/Permanente/Dotal), Beneficiarios (dynamic add/remove list)
    - **hogar**: Dirección del riesgo, Valor inmueble, Valor contenidos, Cobertura
    - **gmm**: Suma asegurada, Deducible, Coaseguro (%), Tope coaseguro, Red (Abierta/Cerrada)
    - **empresarial**: Giro, Ubicación, Suma asegurada, Bienes asegurados
    - **viaje**: Destino, Fecha viaje inicio, Fecha viaje fin, Suma asegurada
    - **danos**: Objeto asegurado, Límite de responsabilidad
    - **obra_civil**: Nombre proyecto, Ubicación, Valor obra, Contratista
- [x] Create `frontend/src/components/polizas/PolizaForm.tsx`:
  - Fields: Número de póliza*, Tipo*, Aseguradora*, Plan, Fecha inicio*, Fecha fin*, Prima*, Moneda, Período de gracia (días), % Comisión, Notas
  - Dynamic `<DetallesCampos>` section based on selected tipo
  - Client selector: autocomplete `<Command>` component searching `GET /api/clientes?q=`
  - Commission preview: shows calculated `monto_comision` as user types prima + porcentaje
  - Pre-fill support: accepts `defaultValues` prop (used by OCR flow)

### 4.3 Frontend — Policy List Page
- [x] Create `frontend/src/components/polizas/VigenciaBadge.tsx`:
  - Props: `diasRestantes: number`, `estatus: EstatusPoliza`
  - Renders colored badge:
    - Red: ≤7 días o vencida
    - Orange: 8–15 días
    - Yellow: 16–30 días
    - Blue: 31–60 días
    - Green: >60 días activa
    - Gray: cancelada
- [x] Create `frontend/src/pages/Polizas.tsx`:
  - Filter bar: Tipo, Aseguradora (dynamic from data), Estatus, "Vence en X días" (select: 7/15/30/60)
  - Table: Nº Póliza, Tipo, Cliente, Aseguradora, Fecha fin, Días restantes (with `VigenciaBadge`), Prima, Comisión, Acciones
  - "Nueva póliza" button → `/polizas/nueva`
  - Sortable columns (fecha_fin, prima)

### 4.4 Frontend — Nueva/Edit Policy Page
- [x] Create `frontend/src/pages/NuevaPoliza.tsx`:
  - Top card: `<OcrUploader>` (built in Module 5)
  - Below: `<PolizaForm>` — pre-fills from OCR result when available
  - Submit → `POST /api/polizas` → redirect to `/polizas/{id}`
- [x] Create `frontend/src/pages/PolizaDetalle.tsx`:
  - Header: número + tipo badge + `VigenciaBadge` + aseguradora
  - **Tab 1 — Información**: all fields, edit mode toggle
  - **Tab 2 — Documentos**: documents attached to this policy; upload button
  - **Tab 3 — Tareas**: tasks linked to this policy
  - **Tab 4 — Historial alertas**: `AlertaEnviada` log for this policy

### 4.5 Verification
- [x] Create auto policy with all detalles → retrieve and verify detalles JSON persisted correctly
- [x] Create GMM policy → verify different field set stored
- [x] `GET /api/polizas?tipo=auto` → only auto policies returned
- [x] `GET /api/polizas?vence_en_dias=30` → only policies with `fecha_fin` within 30 days
- [x] Commission auto-calculates: prima=10000, porcentaje=0.20 → monto_comision=2000.00
- [x] Agente isolation: Agente B cannot `GET /api/polizas/{id}` owned by Agente A

---

## MODULE 5 — AI / OCR Module

### 5.1 Backend — PDF Extraction Service
- [x] Create `backend/app/services/pdf.py`:
  - `extract_text_pdfplumber(file_bytes: bytes) -> str` — uses pdfplumber, returns concatenated text from all pages
  - `extract_text_pymupdf(file_bytes: bytes) -> str` — fallback using PyMuPDF
  - `extract_text(file_bytes: bytes) -> str` — tries pdfplumber first, falls back to PyMuPDF if result is empty or throws; raises `ValueError` if both fail
  - Truncate extracted text to 8000 chars before sending to LLM (cost control)

### 5.2 Backend — LiteLLM Service
- [x] Create `backend/app/services/crypto.py`:
  - `encrypt(plain: str) -> str` — Fernet encrypt, returns base64 string
  - `decrypt(ciphertext: str) -> str` — Fernet decrypt
- [x] Create `backend/app/services/llm.py`:
  - `get_active_config(db) -> ConfigLLM` — raises 503 if no active config
  - `build_model_id(config: ConfigLLM) -> str`:
    - `anthropic` → `"anthropic/claude-sonnet-4-6"`
    - `openai` → `"openai/{config.modelo}"`
    - `google` → `"gemini/{config.modelo}"`
    - `deepseek` → `"deepseek/{config.modelo}"`
  - `call_llm(messages: list, db, usuario_id: int, operacion: str) -> tuple[str, LLMCallLog]`:
    - Gets active config, calls `litellm.acompletion`, captures `completion_cost(response)`
    - Inserts `LLMCallLog` row regardless of success/failure
    - Checks monthly budget: if spend ≥ budget → raises 402 with message "Presupuesto mensual de IA agotado"
  - `OCR_PROMPT_TEMPLATE: str` — extraction prompt (see below)
  - `extract_poliza(text: str, db, usuario_id: int) -> dict`:
    - Calls `call_llm` with OCR_PROMPT_TEMPLATE
    - Parses JSON response
    - Returns dict with `confianza` per field
- [x] OCR extraction prompt (`OCR_PROMPT_TEMPLATE`):
  ```
  Eres un extractor de datos de pólizas de seguros mexicanas.
  Del siguiente texto de una carátula de póliza, extrae estos campos y devuelve
  ÚNICAMENTE un JSON válido. Para cada campo incluye el valor y un nivel de confianza
  entre 0 y 1 (1 = muy seguro, 0 = no encontrado).

  Formato de respuesta:
  {
    "numero": {"valor": "...", "confianza": 0.0},
    "aseguradora": {"valor": "...", "confianza": 0.0},
    "tipo": {"valor": "auto|vida|hogar|gmm|empresarial|viaje|danos|obra_civil", "confianza": 0.0},
    "fecha_inicio": {"valor": "YYYY-MM-DD", "confianza": 0.0},
    "fecha_fin": {"valor": "YYYY-MM-DD", "confianza": 0.0},
    "prima": {"valor": 0.0, "confianza": 0.0},
    "moneda": {"valor": "MXN|USD", "confianza": 0.0},
    "plan": {"valor": "...", "confianza": 0.0},
    "detalles": {"valor": { ...tipo-specific fields... }, "confianza": 0.0}
  }

  Usa null como valor si no encuentras el dato. Nunca inventes datos.
  Texto de la póliza:
  {text}
  ```

### 5.3 Backend — OCR Router
- [x] Create `backend/app/routers/ocr.py`:
  - `POST /api/ocr` — multipart form with `file: UploadFile`
  - Rate limit: 10 req/min per user (using `slowapi`)
  - Validates file is PDF (`content_type == "application/pdf"`)
  - Calls `extract_text(file.read())`
  - Calls `extract_poliza(text, db, current_user.id)`
  - Returns extracted JSON + `llm_log_id` for tracing
  - Saves uploaded file to `uploads/temp/{uuid}.pdf` (cleaned up after 1 hour by scheduler)

### 5.4 Frontend — OCR Uploader Component
- [x] Create `frontend/src/api/ocr.ts` — `uploadPdfForOcr(file: File): Promise<OcrResult>`
- [x] Create `frontend/src/components/polizas/OcrUploader.tsx`:
  - Drag-and-drop zone OR file picker button
  - Accepts only PDF, max 20MB
  - States: `idle` → `uploading` → `processing` → `done` | `error`
  - Shows spinner with "Analizando póliza con IA..." during processing
  - On success: green checkmark, "Campos pre-llenados — revisa los destacados"
  - On error: red alert with error message
  - Props: `onExtracted: (data: OcrResult) => void`
- [x] In `PolizaForm.tsx` — integrate OCR result:
  - When `onExtracted` fires, call `form.setValue(field, value)` for each extracted field
  - Fields with `confianza < 0.8` get a yellow border + tooltip "Verificar — baja confianza (X%)"
  - Fields with `confianza >= 0.8` get a green checkmark icon
  - User can manually override any pre-filled field

### 5.5 Multi-Provider Support
- [ ] Verify LiteLLM works for all 4 providers with a test in `backend/tests/test_llm.py`:
  - Test with anthropic/claude-sonnet-4-6
  - Test with openai/gpt-4o
  - Test with google/gemini-2.0-flash
  - Test with deepseek/deepseek-chat
  - Each test: upload a sample carátula PDF, verify required fields extracted

### 5.6 Verification
- [x] Backend compiles with `python -m compileall backend/app`
- [x] Backend app imports with `backend/venv/Scripts/python.exe -c "from app.main import app"`
- [x] Frontend builds with `npm.cmd run build`
- [ ] Upload a real carátula de seguro de auto PDF → verify: número, aseguradora, fechas, prima extracted
- [ ] Upload same PDF with DeepSeek configured → same fields extracted
- [ ] Upload 11 PDFs in 1 minute → 11th returns HTTP 429
- [ ] Upload non-PDF file → returns HTTP 422 with clear error
- [ ] Upload heavily scanned/low-quality PDF → PyMuPDF fallback triggers; partial extraction still logged
- [ ] Check `GET /api/reportes/ai-costos` → shows cost for the OCR calls made

---

## MODULE 6 — Vigencia & Alertas System

### 6.1 Backend — Expiry Calculation
- [x] Create `backend/app/services/alertas.py`:
  - `get_polizas_proximas_vencer(db, dias_max=60) -> list[Poliza]` — queries all active/por_vencer policies with `fecha_fin` within `dias_max` days
  - `calcular_estatus(poliza: Poliza) -> EstatusPoliza`:
    - `vencida` if `date.today() > fecha_fin + timedelta(days=periodo_gracia_dias)`
    - `por_vencer` if `dias_restantes <= 30`
    - else `activa`
  - `update_estatus_polizas(db)` — batch update all policies' `estatus` field; called by scheduler
  - `ya_enviada(db, poliza_id, dias_antes) -> bool` — checks `AlertaEnviada` table
  - `enviar_alerta_email(poliza: Poliza, dias_antes: int, config: ConfigAlertas)` — builds email content, sends via SMTP
  - `procesar_alertas(db)` — main job function:
    1. Call `update_estatus_polizas`
    2. Get `ConfigAlertas` from DB
    3. For each `dias_antes` in config.dias_anticipacion:
       - Get policies where `dias_restantes == dias_antes`
       - For each: if not `ya_enviada` → send email → insert `AlertaEnviada` row

### 6.2 Backend — Scheduler Setup
- [x] Create `backend/app/services/scheduler.py`:
  - Creates `AsyncIOScheduler` instance
  - Adds job: `procesar_alertas` daily at 08:00 (configurable via env `ALERT_HOUR=8`)
  - `start_scheduler()` / `stop_scheduler()` for lifespan events in `main.py`

### 6.3 Backend — Alert Router
- [x] Create `backend/app/routers/alertas.py`:
  - `GET /api/alertas/proximas` — returns policies grouped by urgency bucket:
    ```json
    {
      "urgente": [...],   // ≤7 días
      "pronto": [...],    // 8–15 días
      "este_mes": [...],  // 16–30 días
      "proximo_bimestre": [...] // 31–60 días
    }
    ```
  - `POST /api/alertas/enviar/{poliza_id}` — manually trigger renewal email for a policy; logs to `AlertaEnviada` with `canal="email_manual"`
  - `GET /api/alertas/historial` — paginated list of `AlertaEnviada` rows; filter by `?poliza_id=`

### 6.4 Frontend — Renovaciones Page
- [x] Create `frontend/src/api/alertas.ts` — `getProximas()`, `enviarAlerta(polizaId)`, `getHistorial(polizaId?)`
- [x] Create `frontend/src/pages/Renovaciones.tsx`:
  - **4 tabs** using shadcn `<Tabs>`: Urgente | Próximas | Este mes | Próximos 2 meses
  - Each tab: table with columns: Cliente, Tipo, Aseguradora, Nº Póliza, Vence el, Días restantes, `VigenciaBadge`, acciones
  - Action buttons per row: [Enviar recordatorio] [Ver póliza] [Renovar (→ edit form)]
  - "Enviar recordatorio" → POST `/api/alertas/enviar/{id}` → toast "Recordatorio enviado" | error toast
  - Empty state: "No hay pólizas por vencer en este período"
- [x] Add badge count to Sidebar `Renovaciones` link — shows count of `urgente` tab policies

### 6.5 Frontend — Dashboard Urgency Cards
- [x] In `Dashboard.tsx`, add 2 stat cards:
  - "Vencen en 7 días" (red) — count from urgente bucket
  - "Vencen en 30 días" (yellow) — count from urgente + pronto + este_mes
  - Clicking card navigates to Renovaciones with correct tab pre-selected

### 6.6 Email Configuration
- [x] In `ConfigAlertas` setup: SMTP config fields (host, port, user, password, from name)
- [ ] `POST /api/config/alertas/test-email` — sends a test email to the configured agent email address
- [~] Alert email template (HTML): clear subject `"AVISO: Póliza #{numero} vence en {dias} días"`, agent branding (name from config), clickable "Ver póliza" deep link

### 6.7 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/alertas` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Create policy with `fecha_fin = today + 7` → immediately appears in "Urgente" tab
- [ ] Create policy with `fecha_fin = today + 35` → appears in "Próximos 2 meses" tab
- [ ] Create policy with `fecha_fin = yesterday - 1` → `estatus` = "vencida", does NOT appear in renovaciones
- [ ] Manually trigger alert → `AlertaEnviada` row inserted; email received at configured address
- [ ] Run `procesar_alertas(db)` twice → second run does NOT send duplicate emails (idempotent)
- [ ] Policy with `fecha_fin = today + 30, periodo_gracia_dias = 5` → still shows as active until day 35

---

## MODULE 7 — Documentos (Document Management)

### 7.1 Backend
- [x] Create `backend/app/schemas/documento.py`:
  - `DocumentoOut(id, nombre_original, tipo, tamaño_bytes, mime_type, poliza_id, cliente_id, subido_por, created_at)`
  - `DocumentoCreate(tipo, poliza_id?, cliente_id?)` — file via multipart
- [x] Create `backend/app/routers/documentos.py`:
  - `POST /api/documentos` — multipart: `file: UploadFile`, `tipo: str`, `poliza_id?: int`, `cliente_id?: int`
    - Validates: max 20MB, allowed types (pdf, jpg, png, docx)
    - Saves to `uploads/{poliza_id or cliente_id}/{uuid}_{original_name}`
    - Inserts `Documento` row
  - `GET /api/documentos/{id}` — streams file back with correct `Content-Type` and `Content-Disposition`
  - `GET /api/documentos` — list; filter by `?poliza_id=` or `?cliente_id=`
  - `DELETE /api/documentos/{id}` — deletes file from disk + DB row; verify ownership

### 7.2 Frontend
- [x] Create `frontend/src/api/documentos.ts` — `uploadDocumento(file, tipo, polizaId?, clienteId?)`, `getDocumentos(polizaId?, clienteId?)`, `downloadDocumento(id, nombre)`, `deleteDocumento(id)`
- [x] Create `frontend/src/components/documentos/DocumentoUploader.tsx`:
  - Drag-and-drop zone + file picker
  - Shows file type selector (Carátula / Endoso / Recibo / Siniestro / Identificación / Otro)
  - Progress bar during upload
  - On success: file appears in list below
- [x] Create `frontend/src/components/documentos/DocumentoList.tsx`:
  - Props: `polizaId?` or `clienteId?`
  - Table: Nombre, Tipo, Tamaño, Fecha subida, Acciones (Ver/Descargar, Eliminar)
  - "Ver" opens PDF in new tab via blob URL
  - "Descargar" triggers file download
  - Confirm dialog before delete

### 7.3 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/documentos` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Upload PDF to a policy → download it → file matches original
- [ ] Upload 25MB file → rejected with 413 / validation error
- [ ] Upload `.exe` file → rejected with "Tipo de archivo no permitido"
- [ ] Delete document → file removed from disk AND DB row gone
- [ ] Agente B cannot download document belonging to Agente A's policy

---

## MODULE 8 — Tareas (Task Management)

### 8.1 Backend
- [x] Create `backend/app/schemas/tarea.py`:
  - `TareaCreate(titulo, tipo, prioridad, fecha_vencimiento, descripcion?, cliente_id?, poliza_id?, asignada_a?)`
  - `TareaOut(+ id, cliente: ClienteOut?, poliza: PolizaSummary?, asignada_a: UsuarioOut, created_at)`
  - `TareaUpdate` — all fields optional including `completada`
- [x] Create `backend/app/routers/tareas.py`:
  - `GET /api/tareas` — list; filters: `?completada=false`, `?fecha_vencimiento_hasta=`, `?cliente_id=`, `?asignada_a=`; data isolation
  - `POST /api/tareas` — create; if `asignada_a` not specified, defaults to `current_user.id`
  - `PUT /api/tareas/{id}` — update; marking `completada=true` sets `completada_en` timestamp
  - `DELETE /api/tareas/{id}` — hard delete

### 8.2 Frontend
- [x] Create `frontend/src/api/tareas.ts` — CRUD functions
- [x] Create `frontend/src/components/tareas/TareaForm.tsx`:
  - Fields: Título*, Tipo (select), Prioridad (select), Fecha vencimiento*, Descripción, Vincular a cliente (autocomplete), Vincular a póliza (autocomplete, filtered by selected client), Asignar a (select, admin only)
  - Validation: required fields, date not in past (warning, not error)
- [x] Create `frontend/src/pages/Tareas.tsx`:
  - Filter bar: Tipo, Prioridad, Completadas (toggle), Fecha vencimiento (range)
  - Table: Título, Tipo badge, Prioridad (color), Cliente/Póliza links, Vence el, Completada (checkbox)
  - Clicking checkbox → optimistic update → PATCH `completada=true`
  - "Nueva tarea" → dialog with `<TareaForm>`
  - Overdue tasks highlighted in red
- [x] In `Dashboard.tsx` — "Tareas pendientes hoy" section:
  - Queries `GET /api/tareas?completada=false&fecha_vencimiento_hasta={today}`
  - Shows max 5 tasks with quick-complete checkbox
  - "Ver todas" link to `/tareas`
- [x] Add sidebar badge: count of incomplete tasks due today or overdue

### 8.3 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/tareas` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Create task linked to a client and policy → verify links appear in detail
- [ ] Mark task complete → checkbox stays checked on refresh; `completada_en` timestamp set
- [ ] Task with `fecha_vencimiento = yesterday` → highlighted red in list + appears in Dashboard overdue tasks
- [ ] Admin assigns task to a different agent → that agent sees it in their task list

---

## MODULE 9 — Comisiones & Reportes

### 9.1 Backend — Commission Data
- [x] Commissions are stored on each `Poliza` (fields: `porcentaje_comision`, `monto_comision`, `comision_pagada`)
- [x] `PUT /api/polizas/{id}` supports `comision_pagada: bool` — toggle to mark commission as paid
- [x] Add `GET /api/polizas/{id}/marcar-comision-pagada` — convenience endpoint

### 9.2 Backend — Reports Router
- [x] Create `backend/app/routers/reportes.py`:
  - `GET /api/reportes/comisiones`:
    - Params: `?mes=2025-03` (default: current month), `?agente_id=` (admin only)
    - Returns:
      ```json
      {
        "total_ganado": 12500.00,
        "total_pagado": 8000.00,
        "total_pendiente": 4500.00,
        "por_aseguradora": [{"aseguradora": "GNP", "total": 5000, "pagado": 3000}],
        "por_tipo": [{"tipo": "auto", "total": 6000}],
        "polizas": [...PolizaOut with commission fields...]
      }
      ```
  - `GET /api/reportes/vencimientos`:
    - Returns count of policies expiring each month for next 6 months
    - Used for dashboard chart
  - `GET /api/reportes/actividad`:
    - Returns: new clients this month, new policies this month, tasks completed this month
    - Comparison with previous month (% change)

### 9.3 Frontend — Reportes Page
- [x] Create `frontend/src/api/reportes.ts` — `getComisiones(mes?, agenteId?)`, `getVencimientos()`, `getActividad()`
- [x] Create `frontend/src/pages/Reportes.tsx` with tabs:
  - **Tab 1 — Comisiones**:
    - Month picker (default: current month)
    - Summary cards: Total ganado / Pagado / Pendiente
    - Table of policies with commissions: Nº Póliza, Cliente, Aseguradora, Prima, % Comisión, Monto comisión, Pagada (toggle)
    - Breakdown by aseguradora (simple bar chart using CSS widths, no chart lib needed)
  - **Tab 2 — Vencimientos**:
    - Timeline: "X pólizas vencen en [mes]" for next 6 months
  - **Tab 3 — Actividad**:
    - Cards: Nuevos clientes, Nuevas pólizas, Tareas completadas vs. previous month

### 9.4 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/reportes` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Create 3 policies with commissions in current month → report shows correct totals
- [ ] Mark one commission as paid → "Total pagado" updates; "Total pendiente" decreases
- [ ] Agente A sees only their commissions; Admin selects Agente B → sees Agente B's commissions

---

## MODULE 10 — AI Cost Tracking

### 10.1 Backend
- [x] `LLMCallLog` already logged in Module 5 (`services/llm.py`)
- [x] Add to `routers/reportes.py`:
  - `GET /api/reportes/ai-costos`:
    - Params: `?mes=` (default: current month)
    - Returns:
      ```json
      {
        "total_usd": 12.45,
        "por_proveedor": [{"proveedor": "anthropic", "calls": 45, "total_usd": 9.20}],
        "por_dia": [{"fecha": "2025-03-01", "total_usd": 0.45}],
        "promedio_por_llamada": 0.28,
        "presupuesto_mensual": 50.00,
        "porcentaje_usado": 24.9,
        "alerta_activa": false
      }
      ```
- [x] Add endpoint `GET /api/reportes/ai-costos/historial` — paginated log of all LLM calls
- [x] Budget alert check in `services/llm.py` — after each call, if `total_month >= presupuesto * (alerta_porcentaje/100)`, set a flag in Redis/DB (simple: store in a `ConfigPresupuesto.alerta_activa` bool field)

### 10.2 Frontend
- [x] In `frontend/src/pages/Configuracion.tsx` — "Costos de IA" section:
  - Month picker
  - Cards: Total gastado este mes / Promedio por llamada / Llamadas realizadas
  - Progress bar: budget used (red if >80%)
  - "Presupuesto mensual: $X USD" with edit button
  - Table: últimas 20 llamadas — fecha, proveedor, modelo, operación, tokens, costo, estado (✓/✗)
- [x] Global budget warning banner: if `alerta_activa=true`, show yellow banner at top of every page: "⚠️ Has usado el X% de tu presupuesto de IA este mes"

### 10.3 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/reportes/ai-costos` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Make 5 OCR calls → `GET /api/reportes/ai-costos` shows correct sum
- [ ] Set budget to $0.01 → make one call → `alerta_activa=true` → banner appears on all pages
- [ ] Failed LLM call (wrong API key) → `LLMCallLog` row with `exito=false` + error_msg stored

---

## MODULE 11 — Configuración (Settings)

### 11.1 Backend
- [x] Create `backend/app/routers/config.py` (all routes require `require_admin`):
  - `GET /api/config/llm` — returns config; API key shown as `"***"` + last 4 chars
  - `PUT /api/config/llm` — upsert config; encrypts API key with Fernet before storing
  - `POST /api/config/llm/test` — makes a minimal test call to the configured provider; returns `{ok: true, modelo: "...", latency_ms: 123}` or error
  - `GET /api/config/alertas` — returns alert config (SMTP password masked)
  - `PUT /api/config/alertas` — update; encrypts SMTP password
  - `POST /api/config/alertas/test-email` — sends test email to agent email
  - `GET /api/config/presupuesto` — list of budgets per provider
  - `PUT /api/config/presupuesto/{proveedor}` — update budget for provider
- [x] On app startup (`main.py` lifespan): if no `ConfigAlertas` row exists → insert defaults; if no `ConfigPresupuesto` row → insert default ($50/month per provider)

### 11.2 Frontend
- [x] Create `frontend/src/api/config.ts` — all config CRUD functions
- [x] Create `frontend/src/pages/Configuracion.tsx` with sections (collapsible cards or tabs):
  - **Proveedor de IA**:
    - Provider dropdown: Anthropic Claude / OpenAI / Google Gemini / DeepSeek
    - Model dropdown (dynamic based on provider):
      - Claude: claude-sonnet-4-6, claude-haiku-4-5
      - OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo
      - Gemini: gemini-2.0-flash, gemini-1.5-pro
      - DeepSeek: deepseek-chat, deepseek-reasoner
    - API Key field (password input; shows last 4 chars of saved key)
    - Temperature slider (0.0 – 1.0, default 0.1)
    - [Probar conexión] button → shows latency + model response test
  - **Alertas de Vencimiento**:
    - Checkboxes: Avisar 60 días antes / 30 días / 15 días / 7 días
    - Toggle: Notificar al agente por email
    - Toggle: Notificar al cliente por email
    - Email del agente (input)
    - SMTP config: Host, Puerto, Usuario, Contraseña, Nombre remitente
    - [Enviar email de prueba] button
  - **Presupuesto de IA**:
    - Per-provider monthly budget input (USD)
    - Alert threshold % slider
    - [Guardar] button
  - **Costos de IA** (from Module 10)
- [x] Page wrapped in `<RoleGuard requiredRole="admin">`

### 11.3 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/config` routes
- [x] Frontend builds with `npm.cmd run build`
- [ ] Configure Anthropic API key → test connection → success response shows model name
- [ ] Configure invalid API key → test connection → shows clear error "API key inválida"
- [ ] Change provider to OpenAI → upload PDF → OCR uses OpenAI
- [ ] Configure SMTP → send test email → email received
- [ ] Non-admin user navigates to `/configuracion` → redirected or sees "No autorizado"

---

## MODULE 12 — Dashboard

### 12.1 Backend
- [x] Add `GET /api/dashboard/stats` — returns all data needed for dashboard in one call:
  ```json
  {
    "total_clientes": 45,
    "total_polizas_activas": 120,
    "polizas_vencen_7_dias": 3,
    "polizas_vencen_30_dias": 12,
    "comision_mes_ganada": 15000.00,
    "comision_mes_pagada": 10000.00,
    "tareas_vencidas": 2,
    "tareas_hoy": 5,
    "proximas_renovaciones": [...5 most urgent PolizaSummary...],
    "tareas_pendientes_hoy": [...5 tasks due today...]
  }
  ```

### 12.2 Frontend
- [x] Create `frontend/src/api/dashboard.ts` — `getDashboardStats()`
- [x] Create `frontend/src/pages/Dashboard.tsx`:
  - **Row 1 — KPI Cards** (4 cards):
    - Total clientes activos (blue)
    - Pólizas activas (green)
    - Vencen en 7 días (red, clickable → Renovaciones/urgente)
    - Vencen en 30 días (orange, clickable → Renovaciones/este_mes)
  - **Row 2 — Comisiones** (2 cards):
    - Comisiones ganadas este mes (MXN)
    - Comisiones pendientes de pago
  - **Row 3 — Two columns**:
    - Left: "Próximas renovaciones" — top 5, each with `VigenciaBadge` + [Enviar recordatorio] button
    - Right: "Tareas pendientes" — tasks due today/overdue, each with quick-complete checkbox + priority badge
  - Data fetched with React Query; auto-refetch every 5 minutes

### 12.3 Verification
- [x] Backend compiles with `backend/venv/Scripts/python.exe -m compileall app`
- [x] Backend app imports and exposes `/api/dashboard/stats`
- [x] Frontend builds with `npm.cmd run build`
- [ ] Dashboard loads in <1 second (single API call)
- [ ] Clicking red "Vencen en 7 días" card → navigates to Renovaciones with Urgente tab selected
- [ ] Quick-complete a task on Dashboard → task disappears from list; count updates

---

## MODULE 13 — App Layout & Navigation

### 13.1 Layout Components
- [x] Create `frontend/src/components/layout/AppLayout.tsx`:
  - Sidebar (left, fixed) + main content area (scrollable)
  - Renders `<Outlet>` from React Router in main area
- [x] Create `frontend/src/components/layout/Sidebar.tsx`:
  - Logo / app name at top
  - Nav links with icons:
    - Dashboard (home icon)
    - Clientes (users icon)
    - Pólizas (file-text icon)
    - Renovaciones (clock icon) + red badge (count of ≤15d policies)
    - Tareas (check-square icon) + orange badge (overdue + due today count)
    - Reportes (bar-chart icon)
    - Configuración (settings icon) — only visible to admin
  - User avatar + name at bottom with logout dropdown
- [x] Create `frontend/src/components/layout/TopBar.tsx`:
  - Page title (dynamic)
  - Budget warning banner (from Module 10) if applicable
  - Breadcrumb for deep pages (e.g., Clientes > Juan Pérez > Póliza #12345)

### 13.2 Verification
- [x] Frontend builds with `npm.cmd run build`
- [x] Removed stale `Soon` nav badges from completed sections
- [ ] All nav links navigate to correct pages
- [ ] Active nav item is highlighted
- [ ] Sidebar badge counts update without page refresh (React Query polling)
- [ ] Logout → token cleared → redirected to login → back button doesn't work (history replaced)

---

## MODULE 14 — Polish & Production Readiness

### 14.1 Error Handling
- [ ] Global error boundary in React — catches runtime errors, shows friendly message
- [ ] Axios response interceptor — all API errors show `toast` notifications with the `detail` message from FastAPI
- [ ] Backend: FastAPI exception handlers for 404 (not found), 403 (forbidden), 422 (validation), 500 (internal)
- [ ] Empty states for every list page: illustration + descriptive message + CTA button

### 14.2 Loading States
- [ ] All data fetches show skeleton loaders (shadcn `<Skeleton>`) while loading
- [ ] Form submit buttons show spinner + disable during submission
- [ ] OCR uploader shows step-by-step progress: "Leyendo PDF → Enviando a IA → Extrayendo datos"

### 14.3 Mobile Responsiveness
- [ ] Sidebar collapses to hamburger menu on screens < 768px
- [ ] Tables become card-list on mobile
- [ ] Forms stack vertically on mobile
- [ ] Test on iOS Safari + Android Chrome

### 14.4 Security Hardening
- [ ] Add `helmet`-equivalent security headers in FastAPI middleware (X-Content-Type-Options, X-Frame-Options)
- [ ] CORS: restrict `allow_origins` to `["http://localhost:5173"]` (not `*`)
- [ ] Uploaded files: validate MIME type from file magic bytes (not just extension)
- [ ] SQL injection: verify all queries use SQLAlchemy ORM (no raw f-string SQL)
- [ ] Add `HTTPS_ONLY` flag in config — when true, sets `secure` cookie flag and HSTS header
- [ ] Rate limiting on `/api/auth/login`: max 5 attempts/min per IP (using slowapi)

### 14.5 Final Checklist
- [ ] All API endpoints return consistent error format: `{"detail": "...", "code": "..."}`
- [ ] All datetime fields stored as UTC in DB, converted to local time in frontend
- [ ] Alembic migrations are clean and reversible (test `alembic downgrade -1`)
- [ ] `backend/.env.example` documents all required variables
- [ ] `README.md` has complete setup instructions (clone → install → run in 5 steps)

---

## Progress Summary

| Module | Backend | Frontend | Tested |
|---|---|---|---|
| 0 · Project Setup | [x] | [x] | [x] |
| 1 · Auth & Users | [x] | [x] | [~] |
| 2 · DB Models | [x] | [x] | [x] |
| 3 · Clientes | [x] | [x] | [x] |
| 4 · Pólizas | [x] | [x] | [x] |
| 5 · AI / OCR | [x] | [x] | [~] |
| 6 · Vigencia & Alertas | [x] | [x] | [~] |
| 7 · Documentos | [x] | [x] | [~] |
| 8 · Tareas | [x] | [x] | [~] |
| 9 · Comisiones & Reportes | [x] | [x] | [~] |
| 10 · AI Cost Tracking | [x] | [x] | [~] |
| 11 · Configuración | [x] | [x] | [~] |
| 12 · Dashboard | [x] | [x] | [~] |
| 13 · Layout & Nav | [-] | [x] | [~] |
| 14 · Polish & Security | [ ] | [ ] | [ ] |
