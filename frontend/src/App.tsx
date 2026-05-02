import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/Sidebar/Sidebar'
import { BiosphereMap } from './components/Map/BiosphereMap'
import { CreateVolumeModal } from './components/modals/CreateVolumeModal'
import { CreateEntityModal } from './components/modals/CreateEntityModal'
import { CreateAreaModal } from './components/modals/CreateAreaModal'
import { useAppStore } from './store/useAppStore'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

function AppShell() {
  const {
    pendingPolygon, setPendingPolygon,
    pendingPoint,   setPendingPoint,
    creationMode,   setCreationMode,
  } = useAppStore()

  function closeArea() { setCreationMode(null) }
  function closeEntity() { setPendingPoint(null); setCreationMode(null) }

  return (
    <div className="flex h-screen overflow-hidden bg-base text-slate-100">
      <Sidebar />
      <BiosphereMap />

      {/* volume drawn on map → fill in details */}
      {pendingPolygon && (
        <CreateVolumeModal polygon={pendingPolygon} onClose={() => setPendingPolygon(null)} />
      )}

      {/* growable area — no map click needed */}
      {creationMode === 'growable_area' && (
        <CreateAreaModal kind="flora" onClose={closeArea} />
      )}

      {/* tool area — no map click needed */}
      {creationMode === 'tool_area' && (
        <CreateAreaModal kind="light" onClose={closeArea} />
      )}

      {/* growable single — point was clicked, preset to flora_unit */}
      {pendingPoint && creationMode === 'growable_single' && (
        <CreateEntityModal point={pendingPoint} preset="flora_unit" onClose={closeEntity} />
      )}

      {/* tool single — point was clicked, hardware types only */}
      {pendingPoint && creationMode === 'tool_single' && (
        <CreateEntityModal point={pendingPoint} filter="hardware" onClose={closeEntity} />
      )}

      {/* no mode active but point clicked (legacy: shouldn't happen now, guard anyway) */}
      {pendingPoint && !creationMode && (
        <CreateEntityModal point={pendingPoint} onClose={closeEntity} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppShell />
    </QueryClientProvider>
  )
}
