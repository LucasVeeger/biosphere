// ── Geo ───────────────────────────────────────────────────────────────────────

export type GeoJSONPoint = {
  type: 'Point'
  coordinates: [number, number, number] // [lon, lat, alt]
}

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: [number, number, number][][]
}

export interface Location {
  id: string
  name: string
  description: string
  coordinate: GeoJSONPoint
}

export type VolumeType = 'home' | 'garden' | 'greenhouse' | 'window'

export interface Volume {
  id: string
  name: string
  type: VolumeType
  boundary?: GeoJSONPolygon
  description: string
  transparency: number
  parent_volume_id?: string
}

// ── Organic ───────────────────────────────────────────────────────────────────

export interface Species {
  id: string
  name: string
  latin_name: string
  description: string
}

export interface FloraArea {
  id: string
  name: string
  volume_id: string
  species_id: string
  species_name: string
  density: number
  density_description: string
}

export interface FloraUnit {
  id: string
  name: string
  location_id: string
  coordinate: GeoJSONPoint
  species_id: string
  species_name: string
  flora_area_id?: string
}

// ── Hardware ──────────────────────────────────────────────────────────────────

export interface Sensor {
  id: string
  location_id: string
  coordinate: GeoJSONPoint
  control_unit_id?: string
}

export interface WaterPump {
  id: string
  location_id: string
  coordinate: GeoJSONPoint
  control_unit_id?: string
}

export interface WaterOutlet {
  id: string
  location_id: string
  coordinate: GeoJSONPoint
  pump_id: string
}

export interface ControlUnit {
  id: string
  name: string
  description: string
  location_id: string
  coordinate: GeoJSONPoint
  parent_control_unit_id?: string
}

export type LightType = 'led' | 'hps'

export interface LightUnit {
  id: string
  type: LightType
  location_id: string
  coordinate: GeoJSONPoint
  control_unit_id?: string
}

export interface LightArea {
  id: string
  type: LightType
  volume_id: string
  control_unit_id?: string
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export type EntityType =
  | 'sensor'
  | 'water_pump'
  | 'water_outlet'
  | 'control_unit'
  | 'light_unit'
  | 'flora_unit'

export type LayerKey = 'volumes' | 'flora' | 'sensors' | 'water' | 'lights' | 'controlUnits'
