// ─── Enums ────────────────────────────────────────────────────────────────────

export type RolUsuario = 'admin' | 'agente'

export type TipoPoliza =
  | 'auto'
  | 'vida'
  | 'hogar'
  | 'gmm'
  | 'empresarial'
  | 'viaje'
  | 'danos'
  | 'obra_civil'

export type EstatusPoliza = 'activa' | 'por_vencer' | 'vencida' | 'cancelada'

export type TipoTarea =
  | 'llamada'
  | 'email'
  | 'cotizacion'
  | 'seguimiento'
  | 'renovacion'
  | 'otro'

export type PrioridadTarea = 'alta' | 'media' | 'baja'

export type TipoDocumento =
  | 'caratula'
  | 'endoso'
  | 'recibo'
  | 'siniestro'
  | 'identificacion'
  | 'otro'

export type ProveedorLLM = 'anthropic' | 'openai' | 'google' | 'deepseek'

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: number
  nombre: string
  telefono?: string
  email?: string
  rfc?: string
  curp?: string
  direccion?: string
  fecha_nacimiento?: string
  notas?: string
  agente_id: number
  polizas_activas?: number
  created_at: string
  updated_at: string
}

export interface ClienteWithPolizas extends Cliente {
  polizas: PolizaSummary[]
}

// ─── Policy Type-Specific Details ────────────────────────────────────────────

export interface DetallesAuto {
  marca?: string
  modelo?: string
  año?: number
  placas?: string
  vin?: string
  suma_asegurada?: number
  tipo_cobertura?: 'amplia' | 'limitada' | 'rc'
}

export interface DetallesVida {
  suma_asegurada?: number
  tipo_vida?: 'temporal' | 'permanente' | 'dotal'
  beneficiarios?: Array<{ nombre: string; porcentaje: number }>
}

export interface DetallesHogar {
  direccion_riesgo?: string
  valor_inmueble?: number
  valor_contenidos?: number
  cobertura?: string
}

export interface DetallesGMM {
  suma_asegurada?: number
  deducible?: number
  coaseguro?: number
  tope_coaseguro?: number
  red?: 'abierta' | 'cerrada'
}

export interface DetallesEmpresarial {
  giro?: string
  ubicacion?: string
  suma_asegurada?: number
  bienes?: string
}

export interface DetallesViaje {
  destino?: string
  fecha_viaje_inicio?: string
  fecha_viaje_fin?: string
  suma_asegurada?: number
}

export interface DetallesDanos {
  objeto_asegurado?: string
  limite_responsabilidad?: number
}

export interface DetallesObraCivil {
  nombre_proyecto?: string
  ubicacion?: string
  valor_obra?: number
  contratista?: string
}

export type DetallesPoliza =
  | DetallesAuto
  | DetallesVida
  | DetallesHogar
  | DetallesGMM
  | DetallesEmpresarial
  | DetallesViaje
  | DetallesDanos
  | DetallesObraCivil

// ─── Poliza ──────────────────────────────────────────────────────────────────

export interface PolizaSummary {
  id: number
  numero: string
  tipo: TipoPoliza
  aseguradora: string
  plan?: string
  fecha_inicio: string
  fecha_fin: string
  prima: number
  moneda: 'MXN' | 'USD'
  estatus: EstatusPoliza
  dias_restantes: number
  monto_comision: number
  comision_pagada: boolean
  cliente_id: number
  cliente?: Cliente
}

export interface Poliza extends PolizaSummary {
  periodo_gracia_dias: number
  porcentaje_comision: number
  detalles: DetallesPoliza
  notas?: string
  agente_id: number
  cliente: Cliente
  created_at: string
  updated_at: string
}

// ─── Documento ───────────────────────────────────────────────────────────────

export interface Documento {
  id: number
  nombre_original: string
  tipo: TipoDocumento
  tamaño_bytes: number
  mime_type: string
  poliza_id?: number
  cliente_id?: number
  subido_por: number
  created_at: string
}

// ─── Tarea ────────────────────────────────────────────────────────────────────

export interface Tarea {
  id: number
  titulo: string
  descripcion?: string
  tipo: TipoTarea
  prioridad: PrioridadTarea
  fecha_vencimiento: string
  completada: boolean
  completada_en?: string
  cliente_id?: number
  poliza_id?: number
  asignada_a: number
  cliente?: Cliente
  poliza?: PolizaSummary
  asignado_a_usuario?: Usuario
  created_at: string
  updated_at: string
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

export interface AlertaEnviada {
  id: number
  poliza_id: number
  dias_antes: number
  canal: string
  destinatario: string
  enviada_en: string
}

export interface AlertasProximas {
  urgente: PolizaSummary[]
  pronto: PolizaSummary[]
  este_mes: PolizaSummary[]
  proximo_bimestre: PolizaSummary[]
}

// ─── LLM / OCR ───────────────────────────────────────────────────────────────

export interface LLMCallLog {
  id: number
  usuario_id: number
  proveedor: ProveedorLLM
  modelo: string
  operacion: string
  input_tokens: number
  output_tokens: number
  costo_usd: number
  exito: boolean
  error_msg?: string
  created_at: string
}

export interface OcrFieldResult {
  valor: string | number | null
  confianza: number
}

export interface OcrResult {
  numero?: OcrFieldResult
  aseguradora?: OcrFieldResult
  tipo?: OcrFieldResult
  fecha_inicio?: OcrFieldResult
  fecha_fin?: OcrFieldResult
  prima?: OcrFieldResult
  moneda?: OcrFieldResult
  plan?: OcrFieldResult
  detalles?: OcrFieldResult
  llm_log_id?: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ConfigLLM {
  id: number
  proveedor: ProveedorLLM
  modelo: string
  api_key_masked: string
  temperatura: number
  activo: boolean
}

export interface ConfigAlertas {
  id: number
  dias_anticipacion: number[]
  email_agente_activo: boolean
  email_cliente_activo: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_from_name?: string
  email_agente?: string
}

export interface ConfigPresupuesto {
  id: number
  proveedor: ProveedorLLM
  presupuesto_mensual_usd: number
  alerta_porcentaje: number
  alerta_activa: boolean
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: Usuario
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_clientes: number
  total_polizas_activas: number
  polizas_vencen_7_dias: number
  polizas_vencen_30_dias: number
  comision_mes_ganada: number
  comision_mes_pagada: number
  tareas_vencidas: number
  tareas_hoy: number
  proximas_renovaciones: PolizaSummary[]
  tareas_pendientes_hoy: Tarea[]
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReporteComisiones {
  total_ganado: number
  total_pagado: number
  total_pendiente: number
  por_aseguradora: Array<{ aseguradora: string; total: number; pagado: number }>
  por_tipo: Array<{ tipo: TipoPoliza; total: number }>
  polizas: PolizaSummary[]
}

export interface ReporteAICostos {
  total_usd: number
  por_proveedor: Array<{ proveedor: string; calls: number; total_usd: number }>
  por_dia: Array<{ fecha: string; total_usd: number }>
  promedio_por_llamada: number
  presupuesto_mensual: number
  porcentaje_usado: number
  alerta_activa: boolean
}
