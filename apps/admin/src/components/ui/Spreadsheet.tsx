export function Spreadsheet({
  columns,
  rows,
}: {
  columns: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-line bg-white">
      <table className="min-w-full border-collapse text-left text-[13px]">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={`${col}-${i}`}
                className="sticky top-0 border-b border-line bg-[#e91e63] px-3 py-2 font-bold whitespace-nowrap text-white"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-muted">
                Bu davr uchun qator yo‘q
              </td>
            </tr>
          ) : (
            rows.map((row, r) => (
              <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-canvas/50'}>
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-line px-3 py-1.5 whitespace-nowrap text-ink">
                    {typeof cell === 'number' ? cell.toLocaleString('uz-UZ') : cell}
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
