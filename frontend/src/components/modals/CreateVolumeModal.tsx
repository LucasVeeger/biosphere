import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { volumesApi } from '../../api/volumes'
import { useAppStore } from '../../store/useAppStore'
import type { GeoJSONPolygon } from '../../types'

const schema = z.object({
  name:         z.string().min(1, 'Name is required'),
  type:         z.enum(['home', 'garden', 'greenhouse', 'window']),
  description:  z.string().optional(),
  transparency: z.number().min(0).max(1).default(0.3),
})
type Form = z.infer<typeof schema>

interface Props {
  polygon: GeoJSONPolygon
  onClose: () => void
}

export function CreateVolumeModal({ polygon, onClose }: Props) {
  const qc = useQueryClient()
  const { setPendingPolygon } = useAppStore()

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'garden', transparency: 0.3 },
  })

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      volumesApi.create({
        ...data,
        boundary: polygon,
        transparency: data.transparency,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes'] })
      setPendingPolygon(null)
      onClose()
    },
  })

  const onSubmit = (data: Form) => mutation.mutate(data)

  return (
    <Modal title="New Volume" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" error={errors.name?.message}>
          <input {...register('name')} placeholder="My garden" className={input} autoFocus />
        </Field>

        <Field label="Type" error={errors.type?.message}>
          <select {...register('type')} className={input}>
            <option value="garden">Garden</option>
            <option value="home">Home</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="window">Window (face)</option>
          </select>
        </Field>

        <Field label="Description">
          <input {...register('description')} placeholder="Optional notes" className={input} />
        </Field>

        <Field label={`Transparency (${0}–1)`}>
          <input {...register('transparency', { valueAsNumber: true })} type="range" min={0} max={1} step={0.05} className="w-full accent-green-500" />
        </Field>

        {mutation.isError && (
          <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
            {mutation.isPending ? 'Saving…' : 'Create Volume'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── tiny shared helpers ───────────────────────────────────────────────────────

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
const btnPrimary = 'px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50'
const btnSecondary = 'px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm'
