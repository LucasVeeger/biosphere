import { api } from './client'
import type { Location, GeoJSONPoint } from '../types'

export interface CreateLocationBody {
  name: string
  description?: string
  coordinate: GeoJSONPoint
}

export const locationsApi = {
  create: (body: CreateLocationBody) => api.post<Location>('/locations', body),
  get: (id: string) => api.get<Location>(`/locations/${id}`),
}
