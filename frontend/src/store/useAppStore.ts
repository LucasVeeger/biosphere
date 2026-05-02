import { create } from 'zustand'
import type { GeoJSONPolygon, GeoJSONPoint, LayerKey } from '../types'

type Layers = Record<LayerKey, boolean>

// null  = no active mode (default: map click selects volume)
// space = draw-polygon mode active
// growable_single / tool_single = next map click creates an entity
// growable_area / tool_area = area modal shown immediately (no map click needed)
export type CreationMode =
  | 'space'
  | 'growable_single'
  | 'growable_area'
  | 'tool_single'
  | 'tool_area'
  | null

interface AppStore {
  selectedVolumeId: string | null
  setSelectedVolumeId: (id: string | null) => void

  layers: Layers
  toggleLayer: (key: LayerKey) => void

  pendingPolygon: GeoJSONPolygon | null
  setPendingPolygon: (p: GeoJSONPolygon | null) => void

  pendingPoint: GeoJSONPoint | null
  setPendingPoint: (p: GeoJSONPoint | null) => void

  creationMode: CreationMode
  setCreationMode: (m: CreationMode) => void
}

export const useAppStore = create<AppStore>((set) => ({
  selectedVolumeId: null,
  setSelectedVolumeId: (id) => set({ selectedVolumeId: id }),

  layers: {
    volumes: true,
    flora: true,
    sensors: true,
    water: true,
    lights: true,
    controlUnits: true,
  },
  toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),

  pendingPolygon: null,
  setPendingPolygon: (p) => set({ pendingPolygon: p }),

  pendingPoint: null,
  setPendingPoint: (p) => set({ pendingPoint: p }),

  creationMode: null,
  setCreationMode: (m) => set({ creationMode: m }),
}))
