import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import { SiteHeader } from '@/components/SiteHeader'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { getSettings } from '@/lib/settings/getSettings'
import { formatZloty } from '@/lib/menu/price'
import { summarizeHours } from '@/lib/hours/summarize'
import type { Locale } from '@/i18n/config'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const loc = locale as Locale
  setRequestLocale(loc)
  const t = await getTranslations('home')
  const f = await getTranslations('footer')
  const s = await getSettings()
  const hoursLines = summarizeHours(s.hours)
  const dayLabel = (d: string) => f(`days.${d}` as 'days.mon')

  function FactTile({ icon, label, value, note }: { icon: IconName; label: string; value: string; note?: string }) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-beet/10 text-beet">
          <Icon name={icon} size={20} />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-2xl font-extrabold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
    )
  }

  return (
    <>
      <SiteHeader locale={loc} />

      <main className="relative overflow-hidden">
        {/* warm blobs behind the plate */}
        <div className="pointer-events-none absolute -right-24 top-10 h-[34rem] w-[34rem] rounded-full bg-beet/10 blur-3xl" />
        <div className="pointer-events-none absolute right-40 top-40 h-64 w-64 rounded-full bg-mustard/20 blur-3xl" />

        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-[1.05fr_.95fr] md:py-16">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-herb" />
              {t('status')}
            </span>

            <h1 className="mt-4 text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-tight">
              {t('title')}<br />
              <span className="text-beet">{t('titleAccent')}</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-ink/70">
              {t('subcopy')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/${loc}/menu`}
                className="rounded-full bg-beet px-6 py-3.5 text-sm font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform hover:-translate-y-0.5"
              >
                {t('cta')}
              </Link>
              <Link
                href={`/${loc}/menu`}
                className="rounded-full border-2 border-ink/85 px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                {t('menuBtn')}
              </Link>
            </div>

            <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t('deliveryLabel')}</dt>
                <dd className="font-bold text-ink">{formatZloty(s.deliveryFee, loc)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t('freeFrom')}</dt>
                <dd className="font-bold text-ink">{formatZloty(s.freeDeliveryThreshold, loc)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t('minLabel')}</dt>
                <dd className="font-bold text-ink">{formatZloty(s.minOrder, loc)}</dd>
              </div>
            </dl>
          </div>

          {/* floating hero plate */}
          <div className="relative z-10 mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-6 rounded-full bg-beet/90" />
            <Image
              src="/dishes/dish-02.webp"
              alt={t('heroAlt')}
              fill
              priority
              sizes="(max-width: 768px) 90vw, 40vw"
              className="object-contain drop-shadow-[0_30px_40px_rgba(36,28,21,.35)]"
            />
            <div
              className="absolute -bottom-2 left-2 rotate-[-6deg] rounded-2xl bg-paper px-4 py-2 shadow-lg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-lg font-extrabold text-ink">Kotlet po wiedeńsku</span>
              <span className="ml-2 font-extrabold text-beet">34 zł</span>
            </div>
          </div>
        </section>

        {/* ===== About ===== */}
        <section id="about" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-20">
            <div className="relative order-last mx-auto aspect-square w-full max-w-sm md:order-first">
              <div className="absolute inset-4 rounded-full bg-mustard/25" />
              <Image
                src="/dishes/dish-14.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 80vw, 24rem"
                className="object-contain drop-shadow-[0_24px_34px_rgba(36,28,21,.3)]"
              />
              <div className="absolute -right-1 bottom-2 h-28 w-28 overflow-hidden rounded-full bg-panel shadow-lg ring-4 ring-paper sm:h-32 sm:w-32">
                <Image src="/dishes/dish-24.webp" alt="" fill sizes="8rem" className="object-contain p-1.5" />
              </div>
            </div>
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-beet">{t('about.eyebrow')}</span>
              <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold leading-tight tracking-tight">
                {t('about.title')}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink/70">{t('about.body1')}</p>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink/70">{t('about.body2')}</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-line bg-panel px-4 py-1.5 text-sm font-semibold text-ink">{t('about.tag1')}</span>
                <span className="rounded-full border border-line bg-panel px-4 py-1.5 text-sm font-semibold text-ink">{t('about.tag2')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Delivery ===== */}
        <section id="delivery" className="scroll-mt-20 border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <div className="max-w-2xl">
              <span className="text-sm font-bold uppercase tracking-widest text-beet">{t('delivery.eyebrow')}</span>
              <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold leading-tight tracking-tight">
                {t('delivery.title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink/70">{t('delivery.subcopy')}</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FactTile icon="truck" label={t('deliveryLabel')} value={formatZloty(s.deliveryFee, loc)} note={t('delivery.feeNote')} />
              <FactTile icon="gift" label={t('freeFrom')} value={formatZloty(s.freeDeliveryThreshold, loc)} />
              <FactTile icon="receipt" label={t('minLabel')} value={formatZloty(s.minOrder, loc)} />
              <FactTile icon="clock" label={t('delivery.timeLabel')} value={t('delivery.timeValue')} />
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-paper">
              <Icon name="wallet" size={22} className="shrink-0 text-mustard" />
              <span className="text-sm font-semibold sm:text-base">{t('delivery.payNote')}</span>
            </div>
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section id="contact" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 md:grid-cols-2 md:py-20">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-beet">{t('contact.eyebrow')}</span>
              <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold leading-tight tracking-tight">
                {t('contact.title')}
              </h2>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-full bg-beet px-6 py-3.5 text-sm font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform hover:-translate-y-0.5"
                >
                  <Icon name="phone" size={17} />{t('contact.call')} · {s.phone}
                </a>
                <Link
                  href={`/${loc}/menu`}
                  className="inline-flex items-center rounded-full border-2 border-ink/85 px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  {t('contact.orderOnline')}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 rounded-3xl border border-line bg-panel p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beet/10 text-beet">
                  <Icon name="pin" size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('contact.addressLabel')}</p>
                  <p className="font-semibold text-ink">{s.addressText}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beet/10 text-beet">
                  <Icon name="clock" size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('contact.hoursLabel')}</p>
                  <dl className="mt-1 space-y-0.5 text-sm">
                    {hoursLines.map((line) => (
                      <div key={line.days[0]} className="flex justify-between gap-4">
                        <dt className="text-ink/60">
                          {line.days.length === 1
                            ? dayLabel(line.days[0])
                            : `${dayLabel(line.days[0])}–${dayLabel(line.days[line.days.length - 1])}`}
                        </dt>
                        <dd className="font-semibold tabular-nums text-ink">
                          {line.hours ? `${line.hours.open}–${line.hours.close}` : f('closed')}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
