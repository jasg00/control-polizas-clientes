import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAlertasConfig,
  getLLMConfig,
  getPresupuestos,
  testAlertasEmail,
  testLLMConfig,
  updateAlertasConfig,
  updateLLMConfig,
  updatePresupuesto,
  type ConfigAlertasPayload,
  type ConfigLLMPayload,
} from '@/api/config'
import { getAICostos, getAIHistorial } from '@/api/reportes'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ConfigPresupuesto, ProveedorLLM } from '@/types/models'

const providerModels: Record<ProveedorLLM, string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

const providers: ProveedorLLM[] = ['anthropic', 'openai', 'google', 'deepseek']
const alertDays = [60, 30, 15, 7]

export default function Configuracion() {
  return (
    <RoleGuard requiredRole="admin" fallback={<div className="p-6 text-sm text-muted-foreground">No autorizado</div>}>
      <ConfiguracionContent />
    </RoleGuard>
  )
}

function ConfiguracionContent() {
  const qc = useQueryClient()
  const { data: llm, isLoading: loadingLLM } = useQuery({ queryKey: ['config', 'llm'], queryFn: getLLMConfig, retry: false })
  const { data: alertas, isLoading: loadingAlertas } = useQuery({ queryKey: ['config', 'alertas'], queryFn: getAlertasConfig })
  const { data: presupuestos = [], isLoading: loadingPresupuestos } = useQuery({ queryKey: ['config', 'presupuesto'], queryFn: getPresupuestos })
  const [llmForm, setLlmForm] = useState<ConfigLLMPayload>({ proveedor: 'anthropic', modelo: 'claude-sonnet-4-6', temperatura: 0.1, activo: true })
  const [alertForm, setAlertForm] = useState<ConfigAlertasPayload>({
    dias_anticipacion: [60, 30, 15, 7],
    email_agente_activo: true,
    email_cliente_activo: false,
  })

  useEffect(() => {
    if (llm) {
      setLlmForm({
        proveedor: llm.proveedor,
        modelo: llm.modelo,
        api_key: '',
        temperatura: llm.temperatura,
        activo: llm.activo,
      })
    }
  }, [llm])

  useEffect(() => {
    if (alertas) {
      setAlertForm({
        dias_anticipacion: alertas.dias_anticipacion,
        email_agente_activo: alertas.email_agente_activo,
        email_cliente_activo: alertas.email_cliente_activo,
        email_agente: alertas.email_agente ?? '',
        smtp_host: alertas.smtp_host ?? '',
        smtp_port: alertas.smtp_port ?? 587,
        smtp_user: alertas.smtp_user ?? '',
        smtp_password: '',
        smtp_from_name: alertas.smtp_from_name ?? '',
      })
    }
  }, [alertas])

  const saveLLM = useMutation({
    mutationFn: updateLLMConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config', 'llm'] })
      toast.success('Proveedor de IA guardado')
    },
    onError: () => toast.error('No se pudo guardar IA'),
  })
  const testLLM = useMutation({
    mutationFn: testLLMConfig,
    onSuccess: (result) => toast[result.ok ? 'success' : 'error'](result.ok ? `Conexion OK (${result.latency_ms} ms)` : result.error ?? 'Error de IA'),
  })
  const saveAlertas = useMutation({
    mutationFn: updateAlertasConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config', 'alertas'] })
      toast.success('Alertas guardadas')
    },
    onError: () => toast.error('No se pudieron guardar alertas'),
  })
  const testEmail = useMutation({
    mutationFn: testAlertasEmail,
    onSuccess: (result) => toast[result.ok ? 'success' : 'error'](result.ok ? `Email enviado (${result.latency_ms} ms)` : result.error ?? 'Error SMTP'),
  })

  const models = useMemo(() => providerModels[llmForm.proveedor], [llmForm.proveedor])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">Proveedor de IA, alertas y presupuestos</p>
      </div>

      <Tabs defaultValue="ia" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ia">Proveedor de IA</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto IA</TabsTrigger>
          <TabsTrigger value="costos">Costos IA</TabsTrigger>
        </TabsList>

        <TabsContent value="ia" className="rounded-lg border bg-white p-5">
          {loadingLLM ? <Skeleton className="h-72 w-full" /> : (
            <div className="max-w-2xl space-y-4">
              <Field label="Proveedor">
                <Select value={llmForm.proveedor} onValueChange={(value) => setLlmForm((form) => ({ ...form, proveedor: value as ProveedorLLM, modelo: providerModels[value as ProveedorLLM][0] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{providers.map((provider) => <SelectItem key={provider} value={provider}>{providerLabel(provider)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Modelo">
                <Select value={llmForm.modelo} onValueChange={(value) => setLlmForm((form) => ({ ...form, modelo: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{models.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={`API Key ${llm?.api_key_masked ? `(${llm.api_key_masked})` : ''}`}>
                <Input type="password" value={llmForm.api_key ?? ''} onChange={(event) => setLlmForm((form) => ({ ...form, api_key: event.target.value }))} />
              </Field>
              <Field label={`Temperatura: ${llmForm.temperatura}`}>
                <Input type="range" min="0" max="1" step="0.1" value={llmForm.temperatura} onChange={(event) => setLlmForm((form) => ({ ...form, temperatura: Number(event.target.value) }))} />
              </Field>
              <div className="flex gap-2">
                <Button onClick={() => saveLLM.mutate(llmForm)} disabled={saveLLM.isPending}>Guardar</Button>
                <Button variant="outline" onClick={() => testLLM.mutate()} disabled={testLLM.isPending}>Probar conexion</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alertas" className="rounded-lg border bg-white p-5">
          {loadingAlertas ? <Skeleton className="h-96 w-full" /> : (
            <div className="max-w-3xl space-y-5">
              <div>
                <Label>Dias de anticipacion</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {alertDays.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={alertForm.dias_anticipacion.includes(day)}
                        onChange={(event) => {
                          setAlertForm((form) => ({
                            ...form,
                            dias_anticipacion: event.target.checked
                              ? [...form.dias_anticipacion, day]
                              : form.dias_anticipacion.filter((value) => value !== day),
                          }))
                        }}
                      />
                      {day} dias
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Toggle label="Notificar agente" checked={alertForm.email_agente_activo} onChange={(value) => setAlertForm((form) => ({ ...form, email_agente_activo: value }))} />
                <Toggle label="Notificar cliente" checked={alertForm.email_cliente_activo} onChange={(value) => setAlertForm((form) => ({ ...form, email_cliente_activo: value }))} />
                <Field label="Email del agente"><Input value={alertForm.email_agente ?? ''} onChange={(event) => setAlertForm((form) => ({ ...form, email_agente: event.target.value }))} /></Field>
                <Field label="SMTP host"><Input value={alertForm.smtp_host ?? ''} onChange={(event) => setAlertForm((form) => ({ ...form, smtp_host: event.target.value }))} /></Field>
                <Field label="SMTP puerto"><Input type="number" value={alertForm.smtp_port ?? 587} onChange={(event) => setAlertForm((form) => ({ ...form, smtp_port: Number(event.target.value) }))} /></Field>
                <Field label="SMTP usuario"><Input value={alertForm.smtp_user ?? ''} onChange={(event) => setAlertForm((form) => ({ ...form, smtp_user: event.target.value }))} /></Field>
                <Field label={`SMTP password ${alertas?.smtp_password_masked ? `(${alertas.smtp_password_masked})` : ''}`}><Input type="password" value={alertForm.smtp_password ?? ''} onChange={(event) => setAlertForm((form) => ({ ...form, smtp_password: event.target.value }))} /></Field>
                <Field label="Nombre remitente"><Input value={alertForm.smtp_from_name ?? ''} onChange={(event) => setAlertForm((form) => ({ ...form, smtp_from_name: event.target.value }))} /></Field>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveAlertas.mutate(alertForm)} disabled={saveAlertas.isPending}>Guardar</Button>
                <Button variant="outline" onClick={() => testEmail.mutate()} disabled={testEmail.isPending}>Enviar email de prueba</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="presupuesto" className="rounded-lg border bg-white p-5">
          {loadingPresupuestos ? <Skeleton className="h-72 w-full" /> : <BudgetList presupuestos={presupuestos} />}
        </TabsContent>

        <TabsContent value="costos" className="rounded-lg border bg-white p-5">
          <AICostSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AICostSection() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const { data: costos, isLoading } = useQuery({
    queryKey: ['reportes', 'ai-costos', mes],
    queryFn: () => getAICostos(mes),
  })
  const { data: historial = [] } = useQuery({
    queryKey: ['reportes', 'ai-costos', 'historial'],
    queryFn: getAIHistorial,
  })

  if (isLoading || !costos) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-5">
      <div className="w-52">
        <Input type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CostCard label="Total gastado" value={`$${costos.total_usd.toFixed(4)} USD`} />
        <CostCard label="Promedio por llamada" value={`$${costos.promedio_por_llamada.toFixed(4)} USD`} />
        <CostCard label="Llamadas realizadas" value={String(costos.por_proveedor.reduce((sum, row) => sum + row.calls, 0))} />
      </div>
      <div className="rounded-md border p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Presupuesto mensual: ${costos.presupuesto_mensual.toFixed(2)} USD</span>
          <span>{costos.porcentaje_usado.toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded bg-muted">
          <div
            className={costos.porcentaje_usado >= 80 ? 'h-3 rounded bg-red-500' : 'h-3 rounded bg-slate-900'}
            style={{ width: `${Math.min(100, costos.porcentaje_usado)}%` }}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="border-b px-4 py-3 font-medium">Ultimas llamadas</div>
        <div className="divide-y">
          {historial.slice(0, 20).map((log) => (
            <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[160px_1fr_120px_100px]">
              <span>{new Date(log.created_at).toLocaleString('es-MX')}</span>
              <span>{log.proveedor} / {log.modelo} / {log.operacion}</span>
              <span>{log.input_tokens + log.output_tokens} tokens</span>
              <span className={log.exito ? 'text-green-700' : 'text-red-700'}>{log.exito ? 'OK' : 'Error'} · ${Number(log.costo_usd).toFixed(4)}</span>
            </div>
          ))}
          {historial.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin llamadas registradas</div>}
        </div>
      </div>
    </div>
  )
}

function CostCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function BudgetList({ presupuestos }: { presupuestos: ConfigPresupuesto[] }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ proveedor, presupuesto_mensual_usd, alerta_porcentaje }: { proveedor: ProveedorLLM; presupuesto_mensual_usd: number; alerta_porcentaje: number }) =>
      updatePresupuesto(proveedor, { presupuesto_mensual_usd, alerta_porcentaje }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config', 'presupuesto'] })
      toast.success('Presupuesto guardado')
    },
    onError: () => toast.error('No se pudo guardar presupuesto'),
  })
  return (
    <div className="space-y-3">
      {presupuestos.map((budget) => (
        <BudgetRow key={budget.proveedor} budget={budget} onSave={(payload) => mutation.mutate(payload)} disabled={mutation.isPending} />
      ))}
    </div>
  )
}

function BudgetRow({ budget, onSave, disabled }: { budget: ConfigPresupuesto; onSave: (payload: { proveedor: ProveedorLLM; presupuesto_mensual_usd: number; alerta_porcentaje: number }) => void; disabled?: boolean }) {
  const [amount, setAmount] = useState(Number(budget.presupuesto_mensual_usd))
  const [threshold, setThreshold] = useState(Number(budget.alerta_porcentaje))
  return (
    <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_160px_180px_auto] sm:items-end">
      <div>
        <div className="font-medium">{providerLabel(budget.proveedor)}</div>
        <p className="text-sm text-muted-foreground">{budget.alerta_activa ? 'Alerta activa' : 'Sin alerta activa'}</p>
      </div>
      <Field label="USD / mes"><Input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></Field>
      <Field label={`Alerta ${threshold}%`}><Input type="range" min="1" max="100" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></Field>
      <Button disabled={disabled} onClick={() => onSave({ proveedor: budget.proveedor, presupuesto_mensual_usd: amount, alerta_porcentaje: threshold })}>Guardar</Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>
}

function providerLabel(provider: ProveedorLLM) {
  const labels: Record<ProveedorLLM, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI',
    google: 'Google Gemini',
    deepseek: 'DeepSeek',
  }
  return labels[provider]
}
