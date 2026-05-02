import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Trash2 } from 'lucide-react'
import { hardwareApi } from '../../api/hardware'
import { floraApi } from '../../api/flora'
import type { Sensor, WaterPump, WaterOutlet, ControlUnit, LightUnit, FloraUnit } from '../../types'

// ── generic confirm ───────────────────────────────────────────────────────────

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <span className="flex items-center gap-1 text-xs shrink-0">
      <button onClick={onConfirm} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
      <span className="text-slate-600">/</span>
      <button onClick={onCancel} className="text-slate-400 hover:text-slate-300">No</button>
    </span>
  )
}

// ── generic entity row ────────────────────────────────────────────────────────

function EntityRow({
  emoji, label, onDelete,
}: { emoji: string; label: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/40 group text-xs text-slate-400">
      <span>{emoji}</span>
      <span className="truncate flex-1">{label}</span>
      {confirming
        ? <ConfirmDelete onConfirm={onDelete} onCancel={() => setConfirming(false)} />
        : <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity shrink-0"><Trash2 size={11} /></button>
      }
    </li>
  )
}

// ── group ─────────────────────────────────────────────────────────────────────

function Group({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  if (count === 0) return null
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-3 py-1 text-xs text-slate-500 hover:text-slate-400"
      >
        <ChevronDown size={10} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        {label}
        <span className="ml-auto bg-slate-700 text-slate-400 rounded px-1">{count}</span>
      </button>
      {open && <ul className="ml-4 border-l border-slate-700/50 pl-2 space-y-0.5 mb-1">{children}</ul>}
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export function EntityList() {
  const qc = useQueryClient()

  const { data: sensors      } = useQuery({ queryKey: ['sensors'],       queryFn: hardwareApi.listSensors })
  const { data: pumps        } = useQuery({ queryKey: ['water-pumps'],   queryFn: hardwareApi.listPumps })
  const { data: outlets      } = useQuery({ queryKey: ['water-outlets'], queryFn: hardwareApi.listOutlets })
  const { data: controlUnits } = useQuery({ queryKey: ['control-units'], queryFn: hardwareApi.listControlUnits })
  const { data: lightUnits   } = useQuery({ queryKey: ['light-units'],   queryFn: hardwareApi.listLightUnits })
  const { data: floraUnits   } = useQuery({ queryKey: ['flora-units'],   queryFn: () => floraApi.listUnits() })

  const delSensor  = useMutation({ mutationFn: (id: string) => hardwareApi.deleteSensor(id),      onSuccess: () => qc.invalidateQueries({ queryKey: ['sensors'] }) })
  const delPump    = useMutation({ mutationFn: (id: string) => hardwareApi.deletePump(id),         onSuccess: () => qc.invalidateQueries({ queryKey: ['water-pumps'] }) })
  const delOutlet  = useMutation({ mutationFn: (id: string) => hardwareApi.deleteOutlet(id),       onSuccess: () => qc.invalidateQueries({ queryKey: ['water-outlets'] }) })
  const delCtrl    = useMutation({ mutationFn: (id: string) => hardwareApi.deleteControlUnit(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['control-units'] }) })
  const delLight   = useMutation({ mutationFn: (id: string) => hardwareApi.deleteLightUnit(id),    onSuccess: () => qc.invalidateQueries({ queryKey: ['light-units'] }) })
  const delFlora   = useMutation({ mutationFn: (id: string) => floraApi.deleteUnit(id),            onSuccess: () => qc.invalidateQueries({ queryKey: ['flora-units'] }) })

  const total = [sensors, pumps, outlets, controlUnits, lightUnits, floraUnits]
    .reduce((n, list) => n + (list?.length ?? 0), 0)

  if (total === 0) return null

  const coord = (e: { coordinate: { coordinates: number[] } }) =>
    `${e.coordinate.coordinates[0].toFixed(3)}, ${e.coordinate.coordinates[1].toFixed(3)}`

  return (
    <div className="border-t border-slate-700/60 pt-2 pb-1">
      <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Entities</p>

      <Group label="Flora Units" count={floraUnits?.length ?? 0}>
        {floraUnits?.map((f: FloraUnit) => (
          <EntityRow key={f.id} emoji="🌿" label={f.name || f.species_name} onDelete={() => delFlora.mutate(f.id)} />
        ))}
      </Group>

      <Group label="Sensors" count={sensors?.length ?? 0}>
        {sensors?.map((s: Sensor) => (
          <EntityRow key={s.id} emoji="📡" label={coord(s)} onDelete={() => delSensor.mutate(s.id)} />
        ))}
      </Group>

      <Group label="Water Pumps" count={pumps?.length ?? 0}>
        {pumps?.map((p: WaterPump) => (
          <EntityRow key={p.id} emoji="💧" label={coord(p)} onDelete={() => delPump.mutate(p.id)} />
        ))}
      </Group>

      <Group label="Water Outlets" count={outlets?.length ?? 0}>
        {outlets?.map((o: WaterOutlet) => (
          <EntityRow key={o.id} emoji="🔵" label={coord(o)} onDelete={() => delOutlet.mutate(o.id)} />
        ))}
      </Group>

      <Group label="Control Units" count={controlUnits?.length ?? 0}>
        {controlUnits?.map((c: ControlUnit) => (
          <EntityRow key={c.id} emoji="🔌" label={c.name} onDelete={() => delCtrl.mutate(c.id)} />
        ))}
      </Group>

      <Group label="Light Units" count={lightUnits?.length ?? 0}>
        {lightUnits?.map((l: LightUnit) => (
          <EntityRow key={l.id} emoji="💡" label={`${l.type.toUpperCase()} · ${coord(l)}`} onDelete={() => delLight.mutate(l.id)} />
        ))}
      </Group>
    </div>
  )
}
