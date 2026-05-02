import { api } from './client'
import type { Species } from '../types'

export const speciesApi = {
  list: () => api.get<Species[]>('/species'),
  create: (body: { name: string; latin_name?: string; description?: string }) =>
    api.post<Species>('/species', body),
}
