import { cn } from '../../lib/utils'
import { t } from '../../i18n'

export function SoonBadge({ className }) {
  return (
    <span className={cn('shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600', className)}>
      {t('Tez orada')}
    </span>
  )
}
