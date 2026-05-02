import { api } from './client'
import type { FloraArea, FloraUnit } from '../types'

export const floraApi = {
  listAreas: (volumeId?: string) =>
    api.get<FloraArea[]>(`/flora-areas${volumeId ? `?volume_id=${volumeId}` : ''}`),
  createArea: (body: {
    name?: string
    volume_id: string
    species_id: string
    density?: number
    density_description?: string
  }) => api.post<FloraArea>('/flora-areas', body),
  deleteArea: (id: string) => api.delete(`/flora-areas/${id}`),

  listUnits: (floraAreaId?: string) =>
    api.get<FloraUnit[]>(`/flora-units${floraAreaId ? `?flora_area_id=${floraAreaId}` : ''}`),
  createUnit: (body: {
    name: string
    location_id: string
    species_id: string
    flora_area_id?: string
  }) => api.post<FloraUnit>('/flora-units', body),
  deleteUnit: (id: string) => api.delete(`/flora-units/${id}`),
}
