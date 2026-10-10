import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SERVICES } from '../../data/services'
import { t } from '../../i18n'

// Yandex Go uslubidagi gorizontal xizmatlar qatori.

const PER_PAGE = 4

export function ServiceStrip() {
  const scroller = useRef(null)
  const [page, setPage] = useState(0)
  const pages = Math.ceil(SERVICES.length / PER_PAGE)

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setPage(max > 0 ? Math.round((el.scrollLeft / max) * (pages - 1)) : 0)
  }

  return (
    <section className="mt-5">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto px-3 pt-3"
      >
        {SERVICES.map(({ to, label, img, badge, wide }) => (
          <Link
            key={to}
            to={to}
            className="flex w-[84px] shrink-0 snap-start flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-canvas">
              <img
                src={img}
                alt=""
                className={`pointer-events-none max-w-none object-contain drop-shadow-md ${
                  wide ? 'w-[76px]' : 'h-[54px] w-[54px]'
                }`}
              />
              {badge ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ff5a1f] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  {t(badge)}
                </span>
              ) : null}
            </span>
            <span className="w-full truncate text-center text-[13px] font-medium text-ink">{t(label)}</span>
          </Link>
        ))}
      </div>

      {pages > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: pages }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-ink' : 'w-1.5 bg-slate-300'}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
