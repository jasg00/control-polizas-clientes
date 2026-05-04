import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReporteAICostos } from '@/types/models'

type Props = {
  title: string
  breadcrumbs: string[]
  aiCostos?: ReporteAICostos
  onOpenMenu: () => void
}

export function TopBar({ title, breadcrumbs, aiCostos, onOpenMenu }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
      {aiCostos?.alerta_activa && (
        <div className="-mx-4 -mt-3 mb-3 bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-900 md:-mx-6 md:px-6">
          Has usado {aiCostos.porcentaje_usado.toFixed(1)}% de tu presupuesto de IA este mes.
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={onOpenMenu}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="truncate text-xl font-semibold">{title}</h1>
          </div>
          <h1 className="hidden text-xl font-semibold md:block">{title}</h1>
          <div className="mt-1 hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="flex items-center gap-1">
                {index > 0 && <span>/</span>}
                <span>{crumb}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
