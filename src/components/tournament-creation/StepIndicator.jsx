import { Fragment } from 'react'
import { motion } from 'framer-motion'

const DEFAULT_STEPS = [
  { num: 1, id: 1, label: 'Basic Details' },
  { num: 2, id: 2, label: 'Match Setup' },
  { num: 3, id: 3, label: 'Slots & Entry' },
  { num: 4, id: 4, label: 'Prize Pool' },
  { num: 5, id: 5, label: 'Media' },
  { num: 6, id: 6, label: 'Schedule' },
  { num: 7, id: 7, label: 'Rules & Regulations' },
  { num: 8, id: 8, label: 'Preview' },
  { num: 9, id: 9, label: 'Publish' },
]

export default function StepIndicator({ currentStep, steps = DEFAULT_STEPS }) {
  const activeSteps = Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_STEPS
  const currentIndex = Math.max(
    0,
    activeSteps.findIndex((s) => (s.id !== undefined ? s.id === currentStep : s.num === currentStep))
  )
  const displayStep = currentIndex + 1
  const percent = activeSteps.length > 1 ? (currentIndex / (activeSteps.length - 1)) * 100 : 100

  return (
    <div className="w-full px-2 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-on-surface-variant font-medium">
          Step {displayStep} of {activeSteps.length}
        </span>
        <span className="text-xs text-on-surface-variant font-medium">
          {Math.round(percent)}% complete
        </span>
      </div>

      {/* Connected stepper */}
      <div className="flex items-start w-full">
        {activeSteps.map((s, idx) => {
          const isPassed = idx < currentIndex
          const isActive = idx === currentIndex
          const displayNum = idx + 1

          return (
            <Fragment key={s.id || s.num || idx}>
              {idx > 0 && (
                <div className="flex-1 flex items-center h-6 sm:h-8">
                  <div className="relative w-full h-[3px] rounded-full bg-outline-variant/25 overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                      initial={false}
                      animate={{ width: idx <= currentIndex ? '100%' : '0%' }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center shrink-0 w-6 sm:w-8">
                <motion.div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                    isPassed
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : isActive
                      ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/25 shadow-[0_0_14px_rgba(99,102,241,0.45)]'
                      : 'bg-surface-container-highest text-on-background/70 border border-outline-variant/40'
                  }`}
                  animate={isActive ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 0.35 }}
                >
                  {isPassed ? (
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="#FFFFFF">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span
                      className={`inline-flex items-center justify-center leading-none ${isActive ? 'text-white' : ''}`}
                      style={isActive ? { color: '#FFFFFF' } : undefined}
                    >
                      {displayNum}
                    </span>
                  )}
                </motion.div>

                <span className={`text-[9px] mt-1.5 text-center leading-tight hidden sm:block ${
                  isActive
                    ? 'text-on-background font-bold'
                    : isPassed
                    ? 'text-on-surface-variant'
                    : 'text-on-surface-variant/80'
                }`}>
                  {s.label}
                </span>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
