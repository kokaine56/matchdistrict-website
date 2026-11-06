import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'

export const ConfirmIdentityOTP = ({ email, onVerify, onResend, onBack, cooldownSeconds = 0, isLoading = false, error = '' }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index, value) => {
    const newOtp = [...otp]
    const digits = value.replace(/\D/g, '')
    if (digits.length > 1) {
      const pasted = digits.slice(0, 6).split('')
      pasted.forEach((digit, offset) => {
        if (index + offset < newOtp.length) newOtp[index + offset] = digit
      })
      setOtp(newOtp)
      inputRefs.current[Math.min(index + pasted.length, 5)]?.focus()
      return
    }
    newOtp[index] = digits
    setOtp(newOtp)

    if (digits !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    e.preventDefault()
    const newOtp = [...otp]
    digits.split('').forEach((digit, index) => { newOtp[index] = digit })
    setOtp(newOtp)
    inputRefs.current[Math.min(digits.length, 5)]?.focus()
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full text-center pb-2">
        <p className="text-xs text-emerald-400 font-bold">Verification code sent to {email}</p>
      </div>

      <div className="flex justify-center w-full mt-4 gap-1.5 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-10 h-12 sm:w-14 sm:h-16 p-0 text-xl sm:text-2xl font-bold text-center text-slate-900 transition-all bg-white border rounded-xl sm:rounded-2xl shrink-0 border-indigo-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {error && <p className="w-full text-left text-red-500 text-xs font-semibold mt-3" role="alert">{error}</p>}

      <button
        type="button"
        onClick={() => onVerify(otp.join(''))}
        disabled={otp.join('').length !== 6 || isLoading}
        className="w-full py-3.5 mt-8 text-sm font-bold text-white transition-all shadow-md bg-indigo-600 rounded-xl hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span>{isLoading ? 'Verifying...' : 'Verify Code &amp; Join'}</span>
      </button>

      <div className="flex flex-col items-center mt-6 gap-4">
        <p className="text-xs text-on-surface-variant">
          {cooldownSeconds > 0 ? `Resend code in ${Math.floor(cooldownSeconds / 60)}:${String(cooldownSeconds % 60).padStart(2, '0')}` : 'No receipt?'}{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldownSeconds > 0 || isLoading}
            className="text-primary font-bold hover:underline underline-offset-4"
          >
            Resend code
          </button>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-xs font-bold text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Change email
        </button>
      </div>
    </div>
  )
}
