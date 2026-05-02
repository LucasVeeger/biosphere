import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { volumesApi } from '../../api/volumes'
import { speciesApi } from '../../api/species'
import { floraApi } from '../../api/flora'
import { hardwareApi } from '../../api/hardware'

// ── FloraArea ─────────────────────────────────────────────────────────────────

const floraSchema = z.object({
  name:               z.string().optional(),
  volume_id:          z.string().min(1, 'Volume is required'),
  species_id:         z.string().min(1, 'Species is required'),
  density:            z.number().min(0).optional(),
  density_description: z.string().optional(),
})
type FloraForm = z.infer<typeof floraSchema>

function FloraAreaForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: volumes } = useQuery({ queryKey: ['volumes'], queryFn: volumesApi.list })
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: speciesApi.list })

  const { register, handleSubmit, formState: { errors } } = useForm<FloraForm>({
    resolver: zodResolver(floraSchema),
  })

  const mutation = useMutation({
    mutationFn: (d: FloraForm) => floraApi.createArea({
      name: d.name,
      volume_id: d.volume_id,
      species_id: d.species_id,
      density: d.density,
      density_description: d.density_description,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flora-areas'] }); onClose() },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <Field label="Name (optional)">
        <input {...register('name')} placeholder="Tomato bed" className={input} />
      </Field>
      <Field label="Volume" error={errors.volume_id?.message}>
        <select {...register('volume_id')} className={input}>
          <option value="">Select volume…</option>
          {volumes?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </Field>
      <Field label="Species" error={errors.species_id?.message}>
        <select {...register('species_id')} className={input}>
          <option value="">Select species…</option>
          {species?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Density (units/m²)">
        <input {...register('density', { valueAsNumber: true })} type="number" step="0.1" className={input} />
      </Field>
      <Field label="Density description">
        <input {...register('density_description')} placeholder="stems, fruits…" className={input} />
      </Field>
      {mutation.isError && <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>}
      <Footer onClose={onClose} pending={mutation.isPending} label="Create Flora Area" />
    </form>
  )
}

// ── LightArea ─────────────────────────────────────────────────────────────────

const lightSchema = z.object({
  volume_id: z.string().min(1, 'Volume is required'),
  type:      z.enum(['led', 'hps']),
})
type LightForm = z.infer<typeof lightSchema>

function LightAreaForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: volumes } = useQuery({ queryKey: ['volumes'], queryFn: volumesApi.list })

  const { register, handleSubmit, formState: { errors } } = useForm<LightForm>({
    resolver: zodResolver(lightSchema),
    defaultValues: { type: 'led' },
  })

  const mutation = useMutation({
    mutationFn: (d: LightForm) => hardwareApi.createLightArea({ type: d.type, volume_id: d.volume_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['light-areas'] }); onClose() },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <Field label="Volume" error={errors.volume_id?.message}>
        <select {...register('volume_id')} className={input}>
          <option value="">Select volume…</option>
          {volumes?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </Field>
      <Field label="Light type">
        <select {...register('type')} className={input}>
          <option value="led">LED</option>
          <option value="hps">HPS</option>
        </select>
      </Field>
      {mutation.isError && <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>}
      <Footer onClose={onClose} pending={mutation.isPending} label="Create Light Area" />
    </form>
  )
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

interface Props {
  kind: 'flora' | 'light'
  onClose: () => void
}

export function CreateAreaModal({ kind, onClose }: Props) {
  return (
    <Modal title={kind === 'flora' ? 'New Flora Area' : 'New Light Area'} onClose={onClose}>
      {kind === 'flora' ? <FloraAreaForm onClose={onClose} /> : <LightAreaForm onClose={onClose} />}
    </Modal>
  )
}

// ── shared ────────────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function Footer({ onClose, pending, label }: { onClose: () => void; pending: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm">Cancel</button>
      <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50">
        {pending ? 'Saving…' : label}
      </button>
    </div>
  )
}

const input = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-500'
