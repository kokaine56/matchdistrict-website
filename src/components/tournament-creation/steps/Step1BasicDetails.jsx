import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import GameDropdown from '../GameDropdown'
import { OptimizedInput, OptimizedTextarea } from '../../OptimizedInput'

export default function Step1BasicDetails({ data, onChange, errors, orgName }) {
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/games')
      .then((r) => r.json())
      .then((res) => { if (!cancelled && res.success) setGames(res.games) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGamesLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleChange = useCallback((field, value) => {
    if (field === 'description' && value.length > 100) {
      value = value.slice(0, 100)
    }
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  const canGenerate = data.title?.trim().length > 0 && data.game?.trim().length > 0

  const handleGenerateDescription = () => {
    if (!canGenerate || isGenerating) return
    setIsGenerating(true)

    const organizer = orgName || 'Match District Host'
    const t = data.title.trim()
    const g = data.game

    const presets = [
      `Welcome to ${t}! Intense ${g} action by ${organizer}. Prove your skills and claim victory.`,
      `${t} is here! ${organizer} brings you premium ${g} competition. Rally your squad and compete!`,
      `${t} — ${g} tournament by ${organizer}. Fight for the top spot. Limited slots, register now!`,
      `The battleground awaits in ${t}. ${organizer} invites all ${g} players to compete.`,
      `${t} — a competitive ${g} tournament with fair play and stacked lobbies. Don't miss out!`,
      `${organizer} presents ${t} — a ${g} showdown. Bring your A-game. Slots fill fast!`
    ]

    const picked = presets[Math.floor(Math.random() * presets.length)]

    setTimeout(() => {
      onChange({ ...data, description: picked })
      setIsGenerating(false)
    }, 400)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-on-background">Basic Details</h2>
        <p className="text-sm text-on-surface-variant mt-1">Set the foundation for your tournament.</p>
      </div>

      {/* Tournament Type: Paid vs Free */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Tournament Type <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (data.is_free) {
                onChange({ ...data, is_free: false });
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              !data.is_free
                ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(59,130,246,0.15)] ring-1 ring-primary/40'
                : 'bg-surface-container border-slate-200 dark:border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-bold ${!data.is_free ? 'text-primary' : 'text-on-background'}`}>
                Paid
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${!data.is_free ? 'bg-primary ring-2 ring-primary/30' : 'bg-transparent border border-outline-variant'}`} />
            </div>
            <p className="text-xs text-on-surface-variant">Includes entry fee & prize pool</p>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!data.is_free) {
                onChange({
                  ...data,
                  is_free: true,
                  entry_fee_amount: '0',
                  prize_pool_amount: '0',
                  entry: 'Free',
                  prize: '',
                  prize_positions: [],
                  mvp_enabled: false,
                  mvp_amount: '0',
                  kill_reward_enabled: false,
                  kill_reward_per_kill: '0',
                  sponsors_enabled: false,
                });
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              data.is_free
                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                : 'bg-surface-container border-slate-200 dark:border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-bold ${data.is_free ? 'text-emerald-500' : 'text-on-background'}`}>
                Free
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${data.is_free ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-transparent border border-outline-variant'}`} />
            </div>
            <p className="text-xs text-on-surface-variant">No entry fee, open participation</p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
          Tournament Title <span className="text-error">*</span>
        </label>
        <OptimizedInput
          value={data.title || ''}
          onChange={(v) => handleChange('title', v)}
          placeholder="e.g. BGMI Weekend Scrims"
          maxLength={20}
          className={`w-full px-4 py-3 rounded-xl bg-surface-container border ${
            errors?.title ? 'border-error/60' : 'border-slate-200 dark:border-outline-variant/30'
          } text-on-background text-sm placeholder-on-surface-variant focus:outline-none focus:border-primary/40 transition-colors`}
        />
        <div className="flex justify-between mt-1">
          {errors?.title && <span className="text-xs text-error">{errors.title}</span>}
          <span className="text-xs text-on-surface-variant ml-auto">{data.title?.length || 0}/20</span>
        </div>
      </div>

      <GameDropdown
        value={data.game || ''}
        onChange={(v) => handleChange('game', v)}
        games={games}
        loading={gamesLoading}
      />
      {errors?.game && <p className="text-xs text-error -mt-4">{errors.game}</p>}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-on-surface-variant">
            Description <span className="text-on-surface-variant/50">(optional, max 100 chars)</span>
          </label>
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={!canGenerate || isGenerating}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              canGenerate && !isGenerating
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] hover:brightness-110 cursor-pointer'
                : 'bg-surface-container text-on-surface-variant/30 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {isGenerating ? 'Generating...' : 'Auto-Generate'}
          </button>
        </div>
        <OptimizedTextarea
          value={data.description || ''}
          onChange={(v) => handleChange('description', v)}
          placeholder="Rules, tournament info, notes, special instructions..."
          maxLength={100}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-surface-container border border-slate-200 dark:border-outline-variant/30 text-on-background text-sm placeholder-on-surface-variant focus:outline-none focus:border-primary/40 transition-colors resize-none"
        />
        <div className="flex justify-between mt-1">
          {errors?.description && <span className="text-xs text-error">{errors.description}</span>}
          <span className="text-xs text-on-surface-variant ml-auto">{data.description?.length || 0}/100</span>
        </div>
      </div>
    </motion.div>
  )
}
