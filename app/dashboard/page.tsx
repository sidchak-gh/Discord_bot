import { getAllIncidents } from '@/lib/db/queries/incidents'
import { signOut } from '@/lib/auth/config'
import Link from 'next/link'
import AutoRefresh from './components/AutoRefresh'


const SEVERITY_COLORS: Record<string, string> = {
  P1: 'bg-red-950/40 text-red-400 border-red-900/40',
  P2: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
  P3: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/40',
}

export default async function DashboardPage() {
  const incidents = await getAllIncidents()

  const stats = {
    total:    incidents.length,
    open:     incidents.filter((i) => i.status === 'open').length,
    claimed:  incidents.filter((i) => i.status === 'claimed').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
    p1:       incidents.filter((i) => i.severity === 'P1' && i.status !== 'resolved').length,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow">🚨</span>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Incident Response Console</h1>
              <p className="text-xs text-gray-500 font-medium">Real-time Operations Centre</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors relative after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-indigo-500">
              Incidents
            </Link>
            <Link href="/dashboard/config" className="text-sm text-gray-400 hover:text-gray-200 font-medium transition-colors">
              Config
            </Link>
            <Link href="/dashboard/logs" className="text-sm text-gray-400 hover:text-gray-200 font-medium transition-colors">
              Logs
            </Link>
            <div className="h-4 w-[1px] bg-gray-800" />
            <form action={async () => { 'use server'; await signOut() }}>
              <button className="text-sm text-gray-500 hover:text-red-400 font-medium transition-all hover:scale-105 cursor-pointer">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-5 mb-8">
          {[
            { label: 'Total Incidents', value: stats.total,    color: 'text-gray-200',  border: 'border-gray-800', bg: 'bg-gray-900/60' },
            { label: 'Open Alerts',    value: stats.open,     color: 'text-red-400',   border: 'border-red-950/40',  bg: 'bg-red-950/10' },
            { label: 'Claimed (Act)',  value: stats.claimed,  color: 'text-amber-400', border: 'border-amber-950/40',bg: 'bg-amber-950/10' },
            { label: 'Resolved',       value: stats.resolved, color: 'text-emerald-400', border: 'border-emerald-950/40', bg: 'bg-emerald-950/10' },
            { label: 'Active P1s',     value: stats.p1,       color: 'text-red-500 font-black', border: 'border-red-900/30', bg: 'bg-red-900/10' },
          ].map((stat) => (
            <div key={stat.label} className={`border ${stat.border} ${stat.bg} rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}>
              <div className={`text-4xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Incidents Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Live Log</h2>
              <p className="text-xs text-gray-500 mt-0.5">Chronological record of reported alerts</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs text-gray-400 font-medium">Auto-sync active (30s)</span>
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="text-5xl mb-4 opacity-80">🛡️</div>
              <h3 className="text-lg font-semibold text-white">All Clear</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">No incidents reported. Use the `/incident` slash command in your Discord server to flag an issue.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/80">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`px-6 py-5 hover:bg-gray-800/20 transition-colors duration-150 ${
                    inc.status === 'resolved' ? 'bg-gray-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-5">
                    {/* Badge */}
                    <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                      <span className="text-xs font-bold text-gray-500 font-mono">INC-{inc.id}</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider ${SEVERITY_COLORS[inc.severity] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                        {inc.severity}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-sm font-bold text-white tracking-tight">{inc.title}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          inc.status === 'open' ? 'bg-red-950/40 text-red-400 border-red-900/40' :
                          inc.status === 'claimed' ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' :
                          'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 leading-relaxed mb-3">{inc.description}</p>
                      
                      {inc.aiSummary && (
                        <div className="bg-indigo-950/20 border-l-2 border-indigo-500 px-3.5 py-2 rounded-r-lg mb-3">
                          <p className="text-xs text-indigo-300 font-medium leading-relaxed">
                            <span className="font-bold mr-1">🤖 AI Summary:</span>{inc.aiSummary}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="text-gray-500">Reporter:</span> {inc.reportedByTag}
                        </span>
                        {inc.affectedSystem && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <span className="text-gray-500">System:</span> <code className="bg-gray-800 px-1 py-0.5 rounded text-[11px] text-gray-300">{inc.affectedSystem}</code>
                          </span>
                        )}
                        {inc.claimedByTag && (
                          <span className="flex items-center gap-1 text-amber-400/80">
                            <span>Claimed:</span> {inc.claimedByTag}
                          </span>
                        )}
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-500">Reported: {new Date(inc.createdAt!).toLocaleString()}</span>
                        {inc.resolvedAt && (
                          <span className="text-emerald-500/80 font-semibold">✓ Resolved: {new Date(inc.resolvedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AutoRefresh />
    </div>
  )
}
