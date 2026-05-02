import { api } from './client'
import type { Sensor, WaterPump, WaterOutlet, ControlUnit, LightUnit, LightArea } from '../types'

export const hardwareApi = {
  // sensors
  listSensors: () => api.get<Sensor[]>('/sensors'),
  createSensor: (body: { location_id: string; control_unit_id?: string }) =>
    api.post<Sensor>('/sensors', body),
  deleteSensor: (id: string) => api.delete(`/sensors/${id}`),

  // pumps
  listPumps: () => api.get<WaterPump[]>('/water-pumps'),
  createPump: (body: { location_id: string; control_unit_id?: string }) =>
    api.post<WaterPump>('/water-pumps', body),
  deletePump: (id: string) => api.delete(`/water-pumps/${id}`),

  // outlets
  listOutlets: () => api.get<WaterOutlet[]>('/water-outlets'),
  createOutlet: (body: { location_id: string; pump_id: string }) =>
    api.post<WaterOutlet>('/water-outlets', body),
  deleteOutlet: (id: string) => api.delete(`/water-outlets/${id}`),

  // control units
  listControlUnits: () => api.get<ControlUnit[]>('/control-units'),
  createControlUnit: (body: {
    name: string
    description?: string
    location_id: string
    parent_control_unit_id?: string
  }) => api.post<ControlUnit>('/control-units', body),
  deleteControlUnit: (id: string) => api.delete(`/control-units/${id}`),

  // light units
  listLightUnits: () => api.get<LightUnit[]>('/light-units'),
  createLightUnit: (body: { type: string; location_id: string; control_unit_id?: string }) =>
    api.post<LightUnit>('/light-units', body),
  deleteLightUnit: (id: string) => api.delete(`/light-units/${id}`),

  // light areas
  listLightAreas: (volumeId?: string) =>
    api.get<LightArea[]>(`/light-areas${volumeId ? `?volume_id=${volumeId}` : ''}`),
  createLightArea: (body: { type: string; volume_id: string; control_unit_id?: string }) =>
    api.post<LightArea>('/light-areas', body),
  deleteLightArea: (id: string) => api.delete(`/light-areas/${id}`),
}
