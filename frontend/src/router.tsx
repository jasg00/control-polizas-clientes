import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import AdminUsuarios from '@/pages/AdminUsuarios'
import Clientes from '@/pages/Clientes'
import ClienteDetalle from '@/pages/ClienteDetalle'
import Polizas from '@/pages/Polizas'
import NuevaPoliza from '@/pages/NuevaPoliza'
import PolizaDetalle from '@/pages/PolizaDetalle'
import Renovaciones from '@/pages/Renovaciones'
import Tareas from '@/pages/Tareas'
import Reportes from '@/pages/Reportes'
import Configuracion from '@/pages/Configuracion'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/clientes', element: <Clientes /> },
          { path: '/clientes/:id', element: <ClienteDetalle /> },
          { path: '/polizas', element: <Polizas /> },
          { path: '/polizas/nueva', element: <NuevaPoliza /> },
          { path: '/polizas/:id', element: <PolizaDetalle /> },
          { path: '/renovaciones', element: <Renovaciones /> },
          { path: '/tareas', element: <Tareas /> },
          { path: '/reportes', element: <Reportes /> },
          { path: '/configuracion', element: <Configuracion /> },
          { path: '/admin/usuarios', element: <AdminUsuarios /> },
        ],
      },
    ],
  },
])
