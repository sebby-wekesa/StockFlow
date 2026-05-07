import Link from 'next/link'
import { RANGE_LABELS, type DateRangeKey } from '@/lib/reports'

export default function ReportsPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const currentRange = (searchParams.range as DateRangeKey) || '30d'

  const reportLinks = [
    {
      title: 'Sales Report',
      description: 'Revenue, branch breakdown, top products & customers',
      href: `/api/reports/sales?range=${currentRange}`,
      icon: '📊',
    },
    {
      title: 'Stock Report',
      description: 'Value at cost vs sell, low stock, slow movers',
      href: '#',
      icon: '📦',
      disabled: true,
    },
    {
      title: 'Production Report',
      description: 'Output, scrap rate per stage',
      href: '#',
      icon: '⚙️',
      disabled: true,
    },
  ]

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-head text-2xl font-bold">Reports</h1>
        <p className="text-muted text-sm mt-1">
          Export data for analysis and reporting
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card p-6 mb-6">
        <h3 className="font-bold mb-4">Report period</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(RANGE_LABELS) as [DateRangeKey, string][]).map(([key, label]) => (
            <Link
              key={key}
              href={`/reports?range=${key}`}
              className={`btn btn-sm ${
                currentRange === key
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-muted mt-2">
          Current period: {RANGE_LABELS[currentRange]}
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportLinks.map((report) => (
          <div key={report.title} className="card p-6">
            <div className="text-3xl mb-3">{report.icon}</div>
            <h3 className="font-bold text-lg mb-2">{report.title}</h3>
            <p className="text-sm text-muted mb-4">{report.description}</p>
            {report.disabled ? (
              <button className="btn btn-outline btn-sm w-full" disabled>
                Coming soon
              </button>
            ) : (
              <a
                href={report.href}
                className="btn btn-primary btn-sm w-full"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download CSV
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tip</h4>
        <p className="text-sm text-blue-800">
          CSV files open directly in Excel, Google Sheets, or any spreadsheet application.
          Use the date range selector above to customize the reporting period.
        </p>
      </div>
    </div>
  )
}