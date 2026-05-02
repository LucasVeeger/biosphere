import { useAppStore } from '../../store/useAppStore'
import type { LayerKey } from '../../types'

const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: 'volumes',      label: 'Volumes',       color: 'bg-slate-400' },
  { key: 'flora',        label: 'Flora',          color: 'bg-green-500' },
  { key: 'sensors',      label: 'Sensors',        color: 'bg-violet-500' },
  { key: 'water',        label: 'Water',          color: 'bg-blue-500' },
  { key: 'lights',       label: 'Lights',         color: 'bg-amber-400' },
  { key: 'controlUnits', label: 'Control Units',  color: 'bg-orange-500' },
]

export function LayerToggles() {
  const { layers, toggleLayer } = useAppStore()

  return (
    <div className="px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Layers</p>
      <div className="space-y-1">
        {LAYERS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
              layers[key] ? 'text-slate-100' : 'text-slate-500'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${layers[key] ? color : 'bg-slate-700'}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
