export interface ReportSheet {
  name: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface ReportPreview {
  period: 'day' | 'week' | 'month'
  label: string
  range: { from: string; to: string }
  sheets: ReportSheet[]
}
