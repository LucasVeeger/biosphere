import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useQuery } from '@tanstack/react-query'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useAppStore } from '../../store/useAppStore'
import { volumesApi } from '../../api/volumes'
import { hardwareApi } from '../../api/hardware'
import { floraApi } from '../../api/flora'
import type { GeoJSONPoint, Volume } from '../../types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// ── layer colours ─────────────────────────────────────────────────────────────
const VOLUME_FILL: Record<string, string> = {
  home:       '#94a3b8',
  garden:     '#22c55e',
  greenhouse: '#14b8a6',
  window:     '#3b82f6',
}

function volumeColor(volumes: Volume[]) {
  return [
    'match', ['get', 'volumeType'],
    ...volumes.flatMap((v) => [v.type, VOLUME_FILL[v.type] ?? '#94a3b8']),
    '#94a3b8',
  ] as mapboxgl.Expression
}

// ── marker helpers ────────────────────────────────────────────────────────────
function makeMarker(color: string, emoji: string): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `
    width:28px;height:28px;border-radius:50%;background:${color};
    display:flex;align-items:center;justify-content:center;
    font-size:14px;border:2px solid rgba(255,255,255,.25);
    cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.5);
  `
  el.textContent = emoji
  return el
}

// ── component ─────────────────────────────────────────────────────────────────
export function BiosphereMap() {
  const container = useRef<HTMLDivElement>(null)
  const map       = useRef<mapboxgl.Map | null>(null)
  const draw      = useRef<MapboxDraw | null>(null)
  const markers   = useRef<mapboxgl.Marker[]>([])

  const {
    layers, creationMode, setCreationMode,
    setPendingPolygon, setPendingPoint, setSelectedVolumeId,
  } = useAppStore()

  const { data: volumes   } = useQuery({ queryKey: ['volumes'],       queryFn: volumesApi.list })
  const { data: sensors   } = useQuery({ queryKey: ['sensors'],       queryFn: hardwareApi.listSensors })
  const { data: pumps     } = useQuery({ queryKey: ['water-pumps'],   queryFn: hardwareApi.listPumps })
  const { data: outlets   } = useQuery({ queryKey: ['water-outlets'], queryFn: hardwareApi.listOutlets })
  const { data: lightUnits} = useQuery({ queryKey: ['light-units'],   queryFn: hardwareApi.listLightUnits })
  const { data: ctrlUnits } = useQuery({ queryKey: ['control-units'], queryFn: hardwareApi.listControlUnits })
  const { data: floraUnits} = useQuery({ queryKey: ['flora-units'],   queryFn: () => floraApi.listUnits() })

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!container.current || map.current) return

    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [4.9, 52.37],
      zoom: 13,
    })

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'bottom-right')

    // geocoder search box (built-in Mapbox Geocoding via SearchBox web component)
    const geocoderContainer = document.createElement('div')
    geocoderContainer.id = 'geocoder-container'
    geocoderContainer.className = 'absolute top-3 left-1/2 -translate-x-1/2 w-72 z-10'
    container.current.appendChild(geocoderContainer)

    const d = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: false },
      styles: drawStyles,
    })
    m.addControl(d, 'top-right')
    draw.current = d

    m.on('load', () => {
      // volumes fill + outline
      m.addSource('volumes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'volumes-fill', type: 'fill', source: 'volumes',
        paint: { 'fill-color': '#22c55e', 'fill-opacity': ['get', 'transparency'] } })
      m.addLayer({ id: 'volumes-outline', type: 'line', source: 'volumes',
        paint: { 'fill-color': '#22c55e', 'line-color': '#fff', 'line-width': 1.5, 'line-opacity': 0.6 } })
      m.addLayer({ id: 'volumes-label', type: 'symbol', source: 'volumes',
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'] },
        paint: { 'text-color': '#f1f5f9', 'text-halo-color': '#0f172a', 'text-halo-width': 1 } })

      m.on('click', 'volumes-fill', (e) => {
        if (e.features?.[0]?.properties?.id) {
          setSelectedVolumeId(e.features[0].properties.id as string)
        }
      })
      m.on('mouseenter', 'volumes-fill', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'volumes-fill', () => { m.getCanvas().style.cursor = '' })
    })

    // draw complete → open create-volume modal
    m.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
      const geom = e.features[0].geometry as GeoJSON.Polygon
      const coords3d = geom.coordinates.map((ring) =>
        ring.map(([lon, lat]) => [lon, lat, 0] as [number, number, number])
      )
      setPendingPolygon({ type: 'Polygon', coordinates: coords3d })
      setCreationMode(null)
      d.deleteAll()
    })

    // click on empty map — behaviour depends on active creationMode (read fresh via getState)
    m.on('click', (e) => {
      if (d.getMode() !== 'simple_select') return // MapboxDraw is eating clicks
      const mode = useAppStore.getState().creationMode
      if (mode === 'growable_single' || mode === 'tool_single') {
        const { lng, lat } = e.lngLat
        setPendingPoint({ type: 'Point', coordinates: [lng, lat, 0] })
        return
      }
      // default: select volume on click
      const features = m.queryRenderedFeatures(e.point, { layers: ['volumes-fill'] })
      if (features.length) {
        setSelectedVolumeId(features[0].properties?.id as string ?? null)
      }
    })

    map.current = m
    return () => { m.remove(); map.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── sync draw mode ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!draw.current) return
    if (creationMode === 'space') draw.current.changeMode('draw_polygon')
    else draw.current.changeMode('simple_select')
  }, [creationMode])

  // ── sync volumes layer ────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const src = m.getSource('volumes') as mapboxgl.GeoJSONSource | undefined
    if (!src) return

    const features: GeoJSON.Feature[] = (volumes ?? [])
      .filter((v) => v.boundary)
      .map((v) => ({
        type: 'Feature',
        id: v.id,
        geometry: v.boundary!,
        properties: { id: v.id, name: v.name, volumeType: v.type, transparency: v.transparency },
      }))
    src.setData({ type: 'FeatureCollection', features })

    const vis = layers.volumes ? 'visible' : 'none'
    ;['volumes-fill', 'volumes-outline', 'volumes-label'].forEach((l) => {
      if (m.getLayer(l)) m.setLayoutProperty(l, 'visibility', vis)
    })

    // update fill colour expression
    if (m.getLayer('volumes-fill') && volumes?.length) {
      m.setPaintProperty('volumes-fill', 'fill-color', volumeColor(volumes))
    }
  }, [volumes, layers.volumes])

  // ── sync point-entity markers ─────────────────────────────────────────────
  const syncMarkers = useCallback(() => {
    const m = map.current
    if (!m) return

    // clear old
    markers.current.forEach((mk) => mk.remove())
    markers.current = []

    const add = (coord: GeoJSONPoint['coordinates'], el: HTMLElement) => {
      const mk = new mapboxgl.Marker({ element: el })
        .setLngLat([coord[0], coord[1]])
        .addTo(m)
      markers.current.push(mk)
    }

    if (layers.sensors)      sensors?.forEach((s) => add(s.coordinate.coordinates, makeMarker('#8b5cf6', '📡')))
    if (layers.water)        pumps?.forEach((p) => add(p.coordinate.coordinates, makeMarker('#3b82f6', '💧')))
    if (layers.water)        outlets?.forEach((o) => add(o.coordinate.coordinates, makeMarker('#60a5fa', '🔵')))
    if (layers.lights)       lightUnits?.forEach((l) => add(l.coordinate.coordinates, makeMarker('#f59e0b', '💡')))
    if (layers.controlUnits) ctrlUnits?.forEach((c) => add(c.coordinate.coordinates, makeMarker('#f97316', '🔌')))
    if (layers.flora)        (floraUnits ?? []).forEach((f) => add(f.coordinate.coordinates, makeMarker('#22c55e', '🌿')))
  }, [sensors, pumps, outlets, lightUnits, ctrlUnits, floraUnits, layers])

  useEffect(() => { syncMarkers() }, [syncMarkers])

  return (
    <div className="relative flex-1 h-full">
      <div ref={container} className="w-full h-full" />

      {/* address search box — rendered over the map */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72">
        <GeocoderInput mapRef={map} />
      </div>
    </div>
  )
}

// ── Geocoder ─────────────────────────────────────────────────────────────────

interface GeocoderProps { mapRef: React.MutableRefObject<mapboxgl.Map | null> }

function GeocoderInput({ mapRef }: GeocoderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      if (listRef.current) listRef.current.innerHTML = ''
      return
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxgl.accessToken}&limit=4`
    const res = await fetch(url)
    const json = await res.json() as { features: { place_name: string; center: [number, number] }[] }
    if (!listRef.current) return
    listRef.current.innerHTML = ''
    json.features.forEach((feat) => {
      const li = document.createElement('li')
      li.textContent = feat.place_name
      li.className = 'px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-700 truncate'
      li.onclick = () => {
        mapRef.current?.flyTo({ center: feat.center, zoom: 15 })
        if (inputRef.current) inputRef.current.value = feat.place_name
        if (listRef.current) listRef.current.innerHTML = ''
      }
      listRef.current!.appendChild(li)
    })
  }, [mapRef])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search address…"
        onChange={(e) => search(e.target.value)}
        className="w-full bg-slate-800/90 backdrop-blur border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 shadow-lg"
      />
      <ul
        ref={listRef}
        className="absolute top-full mt-1 w-full bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg overflow-hidden shadow-xl empty:hidden"
      />
    </div>
  )
}

// ── mapbox-gl-draw styles (dark theme) ───────────────────────────────────────
const drawStyles = [
  { id: 'gl-draw-polygon-fill', type: 'fill', filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 } },
  { id: 'gl-draw-polygon-stroke', type: 'line', filter: ['all', ['==', '$type', 'Polygon']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-dasharray': [4, 2] } },
  { id: 'gl-draw-vertex', type: 'circle', filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 5, 'circle-color': '#22c55e', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } },
  { id: 'gl-draw-midpoint', type: 'circle', filter: ['all', ['==', 'meta', 'midpoint']],
    paint: { 'circle-radius': 3, 'circle-color': '#22c55e' } },
]
