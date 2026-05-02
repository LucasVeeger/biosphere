import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { locationsApi } from '../../api/locations'
import { hardwareApi } from '../../api/hardware'
import { floraApi } from '../../api/flora'
import { speciesApi } from '../../api/species'
import { useAppStore } from '../../store/useAppStore'
import type { GeoJSONPoint, EntityType } from '../../types'

const ALL_TYPES: { value: EntityType; label: string }[] = [
  { value: 'sensor',       label: 'Sensor' },
  { value: 'water_pump',   label: 'Water Pump' },
  { value: 'water_outlet', label: 'Water Outlet' },
  { value: 'control_unit', label: 'Control Unit' },
  { value: 'light_unit',   label: 'Light Unit' },
  { value: 'flora_unit',   label: 'Flora Unit' },
]

const HARDWARE_TYPES: EntityType[] = ['sensor', 'water_pump', 'water_outlet', 'control_unit', 'light_unit']
const FLORA_TYPES: EntityType[]    = ['flora_unit']

const baseSchema = z.object({
  locationName:  z.string().min(1, 'Location name required'),
  entityType:    z.enum(['sensor', 'water_pump', 'water_outlet', 'control_unit', 'light_unit', 'flora_unit']),
  name:          z.string().optional(),
  controlUnitId: z.string().optional(),
  pumpId:        z.string().optional(),
  lightType:     z.enum(['led', 'hps']).optional(),
  speciesId:     z.string().optional(),
  floraAreaId:   z.string().optional(),
})
type Form = z.infer<typeof baseSchema>

interface Props {
  point: GeoJSONPoint
  onClose: () => void
  // preset: skip the type selector, force this entity type
  preset?: EntityType
  // filter: 'flora' | 'hardware' — limit which types appear in the selector
  filter?: 'flora' | 'hardware'
}

export function CreateEntityModal({ point, onClose, preset, filter }: Props) {
  const qc = useQueryClient()
  const { setPendingPoint, setCreationMode } = useAppStore()

  const visibleTypes = preset
    ? ALL_TYPES.filter((t) => t.value === preset)
    : filter === 'flora'
    ? ALL_TYPES.filter((t) => FLORA_TYPES.includes(t.value))
    : filter === 'hardware'
    ? ALL_TYPES.filter((t) => HARDWARE_TYPES.includes(t.value))
    : ALL_TYPES

  const defaultType = preset ?? visibleTypes[0]?.value ?? 'sensor'

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(baseSchema),
    defaultValues: { entityType: defaultType, lightType: 'led' },
  })

  const entityType = watch('entityType')
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: speciesApi.list, enabled: entityType === 'flora_unit' })
  const { data: pumps }   = useQuery({ queryKey: ['water-pumps'], queryFn: hardwareApi.listPumps, enabled: entityType === 'water_outlet' })

  const mutation = useMutation({
    mutationFn: async (data: Form) => {
      const location = await locationsApi.create({ name: data.locationName, coordinate: point })
      switch (data.entityType) {
        case 'sensor':
          return hardwareApi.createSensor({ location_id: location.id, control_unit_id: data.controlUnitId || undefined })
        case 'water_pump':
          return hardwareApi.createPump({ location_id: location.id, control_unit_id: data.controlUnitId || undefined })
        case 'water_outlet':
          if (!data.pumpId) throw new Error('Pump is required for a water outlet')
          return hardwareApi.createOutlet({ location_id: location.id, pump_id: data.pumpId })
        case 'control_unit':
          return hardwareApi.createControlUnit({ name: data.name || data.locationName, location_id: location.id })
        case 'light_unit':
          return hardwareApi.createLightUnit({ type: data.lightType ?? 'led', location_id: location.id, control_unit_id: data.controlUnitId || undefined })
        case 'flora_unit':
          if (!data.speciesId) throw new Error('Species is required for a flora unit')
          return floraApi.createUnit({ name: data.name || data.locationName, location_id: location.id, species_id: data.speciesId, flora_area_id: data.floraAreaId || undefined })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sensors'] })
      qc.invalidateQueries({ queryKey: ['water-pumps'] })
      qc.invalidateQueries({ queryKey: ['water-outlets'] })
      qc.invalidateQueries({ queryKey: ['control-units'] })
      qc.invalidateQueries({ queryKey: ['light-units'] })
      qc.invalidateQueries({ queryKey: ['flora-units'] })
      setPendingPoint(null)
      setCreationMode(null)
      onClose()
    },
  })

  const title = preset === 'flora_unit' ? 'Add Plant' : preset ? `Add ${ALL_TYPES.find(t => t.value === preset)?.label}` : 'Add Entity'
  const coords = `${point.coordinates[0].toFixed(5)}, ${point.coordinates[1].toFixed(5)}`

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-4">{coords}</p>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

        <Field label="Location name" error={errors.locationName?.message}>
          <input {...register('locationName')} placeholder="Near the tomatoes" className={input} autoFocus />
        </Field>

        {/* type selector — hidden when preset fixes it to one option */}
        {!preset && (
          <Field label="Type">
            <select {...register('entityType')} className={input}>
              {visibleTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        )}

        {(entityType === 'control_unit' || entityType === 'flora_unit') && (
          <Field label="Name">
            <input {...register('name')} placeholder="Display name" className={input} />
          </Field>
        )}

        {entityType === 'light_unit' && (
          <Field label="Light type">
            <select {...register('lightType')} className={input}>
              <option value="led">LED</option>
              <option value="hps">HPS</option>
            </select>
          </Field>
        )}

        {entityType === 'water_outlet' && (
          <Field label="Pump">
            <select {...register('pumpId')} className={input}>
              <option value="">Select pump…</option>
              {pumps?.map((p) => <option key={p.id} value={p.id}>{p.id.slice(0, 8)}</option>)}
            </select>
          </Field>
        )}

        {entityType === 'flora_unit' && (
          <Field label="Species" error={errors.speciesId?.message}>
            <select {...register('speciesId')} className={input}>
              <option value="">Select species…</option>
              {species?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        {mutation.isError && <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50">
            {mutation.isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

const input = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-500'
