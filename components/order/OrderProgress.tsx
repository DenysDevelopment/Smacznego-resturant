import type { OrderProgress as Progress } from '@/lib/orders/progress'
import type { OrderStatus } from '@/lib/orders/statusFlow'

function Check() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 6" />
    </svg>
  )
}

export function OrderProgress({ progress, label }: { progress: Progress; label: (k: OrderStatus) => string }) {
  if (progress.kind === 'failed') {
    return (
      <div className="rounded-2xl border border-brick/30 bg-brick/5 px-5 py-4 text-center">
        <p className="text-lg font-extrabold text-brick">{label(progress.status)}</p>
      </div>
    )
  }

  return (
    <ol>
      {progress.steps.map((s, i) => {
        const last = i === progress.steps.length - 1
        const dot =
          s.state === 'done'
            ? 'bg-beet text-paper'
            : s.state === 'current'
              ? 'border-2 border-beet bg-paper text-beet'
              : 'border-2 border-line bg-paper'
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dot}`}>
                {s.state === 'done' ? <Check /> : s.state === 'current' ? <span className="h-2 w-2 rounded-full bg-beet" /> : null}
              </span>
              {!last && <span className={`w-0.5 flex-1 ${s.state === 'done' ? 'bg-beet' : 'bg-line'}`} />}
            </div>
            <span
              className={`pb-6 text-sm leading-6 ${
                s.state === 'current' ? 'font-bold text-beet' : s.state === 'done' ? 'font-semibold text-ink' : 'text-muted'
              }`}
            >
              {label(s.key)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
