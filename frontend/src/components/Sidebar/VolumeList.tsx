import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Home, Leaf, Flower2, Square, Trash2, ChevronDown } from 'lucide-react'
import { volumesApi } from '../../api/volumes'
import { floraApi } from '../../api/flora'
import { hardwareApi } from '../../api/hardware'
import { useAppStore } from '../../store/useAppStore'
import type { Volume, VolumeType, FloraArea, LightArea } from '../../types'

const TYPE_ICON: Record<VolumeType, React.ReactNode> = {
  home:       <Home size={13} />,
  garden:     <Leaf size={13} />,
  greenhouse: <Flower2 size={13} />,
  window:     <Square size={13} />,
}
const TYPE_COLOR: Record<VolumeType, string> = {
  home:       'text-slate-300',
  garden:     'text-green-400',
  greenhouse: 'text-teal-400',
  window:     'text-blue-400',
}

// ── inline confirm ────────────────────────────────────────────────────────────

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <button onClick={onConfirm} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
      <span className="text-slate-600">/</span>
      <button onClick={onCancel} className="text-slate-400 hover:text-slate-300">No</button>
    </span>
  )
}

// ── area rows ─────────────────────────────────────────────────────────────────

function FloraAreaRow({ area }: { area: FloraArea }) {
  const [confirming, setConfirming] = useState(false)
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => floraApi.deleteArea(area.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flora-areas'] }),
  })
  return (
    <li className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/40 group text-xs text-slate-400">
      <span className="text-green-500/70">🌿</span>
      <span className="truncate flex-1">{area.name || area.species_name}</span>
      {confirming
        ? <ConfirmDelete onConfirm={() => del.mutate()} onCancel={() => setConfirming(false)} />
        : <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"><Trash2 size={11} /></button>
      }
    </li>
  )
}

function LightAreaRow({ area }: { area: LightArea }) {
  const [confirming, setConfirming] = useState(false)
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => hardwareApi.deleteLightArea(area.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['light-areas'] }),
  })
  return (
    <li className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/40 group text-xs text-slate-400">
      <span className="text-amber-400/70">💡</span>
      <span className="truncate flex-1">{area.type.toUpperCase()} area</span>
      {confirming
        ? <ConfirmDelete onConfirm={() => del.mutate()} onCancel={() => setConfirming(false)} />
        : <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"><Trash2 size={11} /></button>
      }
    </li>
  )
}

// ── expanded areas panel ──────────────────────────────────────────────────────

function VolumeAreas({ volumeId }: { volumeId: string }) {
  const { data: floraAreas } = useQuery({
    queryKey: ['flora-areas', volumeId],
    queryFn: () => floraApi.listAreas(volumeId),
  })
  const { data: lightAreas } = useQuery({
    queryKey: ['light-areas', volumeId],
    queryFn: () => hardwareApi.listLightAreas(volumeId),
  })

  const total = (floraAreas?.length ?? 0) + (lightAreas?.length ?? 0)
  if (total === 0) return <p className="px-3 py-1 text-xs text-slate-600 italic">No areas yet</p>

  return (
    <ul className="ml-5 border-l border-slate-700/50 pl-2 mt-0.5 mb-1 space-y-0.5">
      {floraAreas?.map((a) => <FloraAreaRow key={a.id} area={a} />)}
      {lightAreas?.map((a) => <LightAreaRow key={a.id} area={a} />)}
    </ul>
  )
}

// ── volume row ────────────────────────────────────────────────────────────────

function VolumeRow({ volume }: { volume: Volume }) {
  const { selectedVolumeId, setSelectedVolumeId } = useAppStore()
  const [confirming, setConfirming] = useState(false)
  const qc = useQueryClient()
  const selected = selectedVolumeId === volume.id

  const del = useMutation({
    mutationFn: () => volumesApi.delete(volume.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes'] })
      if (selectedVolumeId === volume.id) setSelectedVolumeId(null)
    },
  })

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
          selected ? 'bg-slate-700 text-slate-100' : 'text-slate-300 hover:bg-slate-700/50'
        }`}
        onClick={() => setSelectedVolumeId(selected ? null : volume.id)}
      >
        <span className={TYPE_COLOR[volume.type]}>{TYPE_ICON[volume.type]}</span>
        <span className="truncate flex-1 text-sm">{volume.name}</span>

        {/* actions shown on hover, right-aligned */}
        <span className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {confirming
            ? <ConfirmDelete onConfirm={() => del.mutate()} onCancel={() => setConfirming(false)} />
            : <button
                onClick={() => setConfirming(true)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
          }
          <ChevronDown
            size={12}
            className={`text-slate-500 transition-transform ${selected ? 'rotate-180' : ''}`}
          />
        </span>
      </div>

      {selected && <VolumeAreas volumeId={volume.id} />}
    </div>
  )
}

// ── list ──────────────────────────────────────────────────────────────────────

export function VolumeList() {
  const { data: volumes, isLoading } = useQuery({
    queryKey: ['volumes'],
    queryFn: volumesApi.list,
  })

  if (isLoading) return <p className="px-3 py-2 text-xs text-slate-500">Loading…</p>
  if (!volumes?.length) return <p className="px-3 py-2 text-xs text-slate-500">No volumes yet. Use <em>Add → Space</em> to draw one.</p>

  return (
    <div className="px-2 space-y-0.5">
      {volumes.map((v) => <VolumeRow key={v.id} volume={v} />)}
    </div>
  )
}
