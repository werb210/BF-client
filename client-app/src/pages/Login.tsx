import { useMemo, useState } from 'react';
import { startOtp, verifyOtp } from '@/api/auth';

const OTP_EXPIRY_MS = 240000;

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);

  const isCodeExpired = useMemo(() => {
    if (!otpSentAt) return true;
    return Date.now() - otpSentAt > OTP_EXPIRY_MS;
  }, [otpSentAt]);

  const handleStart = async () => {
    try {
      setError('');
      await startOtp(phone);
      setOtpSentAt(Date.now());
      setStep('code');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to send code');
    }
  };

  const handleVerify = async () => {
    try {
      setError('');

      if (!otpSentAt || Date.now() - otpSentAt > OTP_EXPIRY_MS) {
        throw new Error('Code expired. Request a new one.');
      }

      await verifyOtp(phone, code);
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Invalid code');
    }
  };

  return (
    <div>
      {step === 'phone' && (
        <>
          <input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleStart}>Send Code</button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={handleVerify} disabled={isCodeExpired}>
            {isCodeExpired ? 'Code Expired' : 'Verify'}
          </button>
          <button onClick={handleStart}>Resend Code</button>
        </>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
