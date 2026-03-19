import { useState } from 'react';
import { startOtp, verifyOtp } from '@/api/auth';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');

  const handleStart = async () => {
    try {
      setError('');
      await startOtp(phone);
      setStep('code');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to send code');
    }
  };

  const handleVerify = async () => {
    try {
      setError('');
      await verifyOtp(phone, code);
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Invalid code');
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
          <button onClick={handleVerify}>Verify</button>
        </>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
