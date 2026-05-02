import { Sprout } from 'lucide-react'
import { VolumeList } from './VolumeList'
import { EntityList } from './EntityList'
import { LayerToggles } from './LayerToggles'
import { ActionBar } from './ActionBar'

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-surface flex flex-col h-full border-r border-slate-700/60 z-10">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700/60">
        <Sprout size={18} className="text-green-400" />
        <span className="font-semibold text-slate-100 tracking-tight">Biosphere</span>
      </div>

      <ActionBar />

      <div className="flex-1 overflow-y-auto py-2 flex flex-col">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Volumes</p>
          <VolumeList />
        </div>
        <EntityList />
      </div>

      <div className="border-t border-slate-700/60 py-2">
        <LayerToggles />
      </div>
    </aside>
  )
}
