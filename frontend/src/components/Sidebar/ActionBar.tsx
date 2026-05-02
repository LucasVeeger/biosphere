import { useState } from 'react'
import { Box, Leaf, Wrench, ChevronDown } from 'lucide-react'
import { useAppStore, type CreationMode } from '../../store/useAppStore'

interface SubItem { label: string; mode: CreationMode }
interface Action {
  label: string
  icon: React.ReactNode
  mode?: CreationMode          // direct mode (no submenu)
  children?: SubItem[]
}

const ACTIONS: Action[] = [
  {
    label: 'Space',
    icon: <Box size={13} />,
    mode: 'space',
  },
  {
    label: 'Growable',
    icon: <Leaf size={13} />,
    children: [
      { label: 'Area',   mode: 'growable_area'   },
      { label: 'Single', mode: 'growable_single' },
    ],
  },
  {
    label: 'Tool',
    icon: <Wrench size={13} />,
    children: [
      { label: 'Area',   mode: 'tool_area'   },
      { label: 'Single', mode: 'tool_single' },
    ],
  },
]

export function ActionBar() {
  const { creationMode, setCreationMode } = useAppStore()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  function activate(mode: CreationMode) {
    // toggle off if already active
    setCreationMode(creationMode === mode ? null : mode)
    setOpenMenu(null)
  }

  function toggleMenu(label: string) {
    setOpenMenu(openMenu === label ? null : label)
  }

  return (
    <div className="px-3 py-2 border-b border-slate-700/60">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Add</p>
      <div className="flex flex-col gap-1">
        {ACTIONS.map((action) => {
          const isActive = action.mode
            ? creationMode === action.mode
            : action.children?.some((c) => creationMode === c.mode)

          if (action.mode) {
            return (
              <button
                key={action.label}
                onClick={() => activate(action.mode!)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors ${
                  isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {action.icon}
                {action.label}
                {isActive && (
                  <span className="ml-auto text-xs text-green-400/70">
                    {action.label === 'Space' ? 'draw polygon' : 'click map'}
                  </span>
                )}
              </button>
            )
          }

          // has submenu
          const menuOpen = openMenu === action.label
          return (
            <div key={action.label}>
              <button
                onClick={() => toggleMenu(action.label)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors ${
                  isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {action.icon}
                {action.label}
                <ChevronDown
                  size={12}
                  className={`ml-auto transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div className="mt-1 ml-3 flex gap-1">
                  {action.children!.map((child) => {
                    const childActive = creationMode === child.mode
                    return (
                      <button
                        key={child.label}
                        onClick={() => activate(child.mode)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          childActive
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {child.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
