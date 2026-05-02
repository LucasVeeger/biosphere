import { api } from './client'
import type { Volume, GeoJSONPolygon, VolumeType } from '../types'

export interface CreateVolumeBody {
  name: string
  type: VolumeType
  boundary?: GeoJSONPolygon
  description?: string
  transparency?: number
  parent_volume_id?: string
}

export const volumesApi = {
  list: () => api.get<Volume[]>('/volumes'),
  get: (id: string) => api.get<Volume>(`/volumes/${id}`),
  create: (body: CreateVolumeBody) => api.post<Volume>('/volumes', body),
  update: (id: string, body: CreateVolumeBody) => api.put<Volume>(`/volumes/${id}`, body),
  delete: (id: string) => api.delete(`/volumes/${id}`),
}
