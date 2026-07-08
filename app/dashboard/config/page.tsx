'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type ServerConfig = {
  guildId: string
  guildName: string
  incidentsChannel: string | null
  mirrorWebhookUrl: string | null
  p1RoleId: string | null
  p2RoleId: string | null
  autoSeverity: boolean | null
}

export default function ConfigPage() {
  const [configs, setConfigs]             = useState<ServerConfig[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState<string>('new')
  const [guildId, setGuildId]             = useState('')
  const [guildName, setGuildName]         = useState('')
  const [incidentsCh, setIncidentsCh]     = useState('')
  const [mirrorUrl, setMirrorUrl]         = useState('')
  const [p1Role, setP1Role]               = useState('')
  const [p2Role, setP2Role]               = useState('')
  const [autoSeverity, setAutoSeverity]   = useState(true)
  const [saving, setSaving]               = useState(false)
  const [message, setMessage]             = useState('')
  const [testing, setTesting]             = useState(false)
  const [clientId, setClientId]           = useState<string | null>(null)

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
      }
    } catch (err) {
      console.error('Failed to load configs:', err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConfigs()

    fetch('/api/discord/client-id')
      .then((res) => res.json())
      .then((data) => setClientId(data.clientId))
      .catch((err) => console.error('Failed to load client ID:', err))
  }, [loadConfigs])

  const handleGuildSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedGuildId(val)
    setMessage('')
    if (val === 'new') {
      setGuildId('')
      setGuildName('')
      setIncidentsCh('')
      setMirrorUrl('')
      setP1Role('')
      setP2Role('')
      setAutoSeverity(true)
    } else {
      const match = configs.find((c) => c.guildId === val)
      if (match) {
        setGuildId(match.guildId)
        setGuildName(match.guildName)
        setIncidentsCh(match.incidentsChannel ?? '')
        setMirrorUrl(match.mirrorWebhookUrl ?? '')
        setP1Role(match.p1RoleId ?? '')
        setP2Role(match.p2RoleId ?? '')
        setAutoSeverity(match.autoSeverity ?? true)
      }
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId, guildName,
          incidentsChannel: incidentsCh || null,
          mirrorWebhookUrl: mirrorUrl || null,
          p1RoleId: p1Role || null,
          p2RoleId: p2Role || null,
          autoSeverity,
        }),
      })
      if (res.ok) {
        setMessage('✅ Configuration saved!')
        loadConfigs()
        if (selectedGuildId === 'new') {
          setSelectedGuildId(guildId)
        }
      } else {
        setMessage('❌ Save failed.')
      }
    } catch {
      setMessage('❌ Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const testMirror = async () => {
    setTesting(true)
    setMessage('')
    try {
      const res = await fetch('/api/config/test-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mirrorWebhookUrl: mirrorUrl }),
      })
      if (res.ok) setMessage('✅ Test message sent to mirror channel!')
      else setMessage('❌ Mirror test failed. Check the webhook URL.')
    } catch {
      setMessage('❌ Mirror test failed. Check the webhook URL.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-xl font-bold text-white">Server Configuration</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-300">← Incidents</Link>
            <Link href="/dashboard/logs" className="text-sm text-gray-400 hover:text-gray-300">Logs</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          <p className="text-sm text-gray-400">
            Configure the bot for your Discord server. Choose an existing guild to edit or set up a new one.
          </p>

          {clientId && (
            <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-lg flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Connect Bot to Server</h3>
                <p className="text-xs text-gray-400 mt-0.5">Invite the bot to your Discord server to enable slash commands</p>
              </div>
              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
              >
                🔌 Connect Bot
              </a>
            </div>
          )}

          {/* Selector */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Select Discord Server (Guild)</label>
            <select
              value={selectedGuildId}
              onChange={handleGuildSelect}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="new">+ Add New Server...</option>
              {configs.map((c) => (
                <option key={c.guildId} value={c.guildId}>
                  {c.guildName} ({c.guildId})
                </option>
              ))}
            </select>
          </div>

          {/* Guild Fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Guild ID"
              value={guildId}
              onChange={setGuildId}
              placeholder="123456789012345678"
              disabled={selectedGuildId !== 'new'}
            />
            <Field
              label="Guild Name"
              value={guildName}
              onChange={setGuildName}
              placeholder="My Server"
            />
          </div>

          {/* Channels */}
          <Field
            label="Incidents Channel ID"
            value={incidentsCh}
            onChange={setIncidentsCh}
            placeholder="The channel ID where bot posts incident cards"
            hint="Right-click the channel → Copy Channel ID"
          />
          <div className="space-y-2">
            <Field
              label="Mirror Channel Webhook URL"
              value={mirrorUrl}
              onChange={setMirrorUrl}
              placeholder="https://discord.com/api/webhooks/..."
              hint="Channel Settings → Integrations → Webhooks → New Webhook → Copy URL"
            />
            <button
              onClick={testMirror}
              disabled={!mirrorUrl || testing}
              className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testing ? 'Sending...' : '📤 Send test message to mirror channel'}
            </button>
          </div>

          {/* Roles */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="P1 Role ID (to ping)" value={p1Role} onChange={setP1Role} placeholder="Role ID (optional)" />
            <Field label="P2 Role ID (to ping)" value={p2Role} onChange={setP2Role} placeholder="Role ID (optional)" />
          </div>

          {/* Auto Severity Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <div className="font-medium text-white">AI Auto-Severity</div>
              <div className="text-sm text-gray-400">Let Gemini automatically assign P1/P2/P3 severity</div>
            </div>
            <button
              onClick={() => setAutoSeverity(!autoSeverity)}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoSeverity ? 'bg-indigo-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoSeverity ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {message}
            </div>
          )}

          <button
            onClick={save}
            disabled={!guildId || saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </main>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, hint, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-indigo-500 transition-colors"
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

