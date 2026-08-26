import { cn } from '../../lib/utils'

export interface Column<T> {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyLabel = 'Ma’lumot topilmadi',
}: {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  emptyLabel?: string
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas/60">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-canvas/60')}
              >
                {columns.map((col) => (
                  <td key={col.header} className={cn('px-4 py-3 align-middle', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
