import { db } from '@/lib/db/client'
import { interactionLog } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import AutoRefresh from '../components/AutoRefresh'


export default async function LogsPage() {
  const logs = await db
    .select()
    .from(interactionLog)
    .orderBy(desc(interactionLog.createdAt))
    .limit(100)

  const stats = {
    total:   logs.length,
    success: logs.filter((l) => l.status === 'success').length,
    failed:  logs.filter((l) => l.status === 'failed').length,
    pending: logs.filter((l) => l.status === 'pending').length,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <h1 className="text-xl font-bold text-white">Interaction Logs</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-300">← Incidents</Link>
            <Link href="/dashboard/config" className="text-sm text-gray-400 hover:text-gray-300">Config</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total',   value: stats.total,   color: 'text-gray-300' },
            { label: 'Success', value: stats.success, color: 'text-green-400' },
            { label: 'Failed',  value: stats.failed,  color: 'text-red-400' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Last 100 Interactions</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Interaction ID</th>
                  <th className="px-4 py-3 text-left">Command</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Error</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {log.interactionId.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {log.commandName ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-900/50 text-green-400' :
                        log.status === 'failed'  ? 'bg-red-900/50 text-red-400' :
                                                   'bg-yellow-900/50 text-yellow-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {log.processingMs != null ? `${log.processingMs}ms` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                      {log.errorMessage ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.createdAt!).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AutoRefresh />
    </div>
  )
}
