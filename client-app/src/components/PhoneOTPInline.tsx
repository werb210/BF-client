// BF_PHONE_OTP_INLINE_v27 — Block 27
// Inline OTP form that replaces the "Start Your Application" CTA.
// Two screens, no page change:
//   1. Enter phone → POST /api/auth/otp/start
//   2. Enter code  → POST /api/auth/otp/verify
//                  → POST /api/public/application/start (mint token)
//                  → write tokens to localStorage
//                  → navigate to /apply/step-1
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  ((import.meta as any).env?.VITE_API_URL) || 'https://server.boreal.financial';

type Phase = 'phone' | 'code' | 'submitting';

export default function PhoneOTPInline() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('phone');
  const [phone, setPhone] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(): Promise<void> {
    setError(null);
    if (!/^\+?\d{10,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
      setError('Enter a valid phone number in E.164 format (+1...).');
      return;
    }
    setBusy(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[otp] start.send', { phone });
      const res = await fetch(API_BASE + '/api/auth/otp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, channel: 'sms' }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => String(res.status));
        throw new Error(body || ('OTP start failed: ' + res.status));
      }
      // eslint-disable-next-line no-console
      console.log('[otp] start.ok');
      setPhase('code');
    } catch (err: any) {
      setError(err?.message || 'Failed to send code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndStart(): Promise<void> {
    setError(null);
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError('Enter the code you received.');
      return;
    }
    setBusy(true);
    setPhase('submitting');
    try {
      // 1. Verify the OTP.
      // eslint-disable-next-line no-console
      console.log('[otp] verify.send');
      const verifyRes = await fetch(API_BASE + '/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        throw new Error((verifyBody as any)?.message || 'Code is incorrect');
      }
      const jwt =
        (verifyBody as any)?.token ??
        (verifyBody as any)?.jwt ??
        (verifyBody as any)?.data?.token;
      if (jwt && typeof localStorage !== 'undefined') {
        localStorage.setItem('bf_jwt_token', String(jwt));
      }
      // eslint-disable-next-line no-console
      console.log('[otp] verify.ok', { hasJwt: !!jwt });

      // 2. Mint the application row server-side and capture its token.
      const startRes = await fetch(API_BASE + '/api/public/application/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ source: 'client_direct', phone }),
      });
      const startBody = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        throw new Error((startBody as any)?.message || ('Could not start application: ' + startRes.status));
      }
      const appToken =
        (startBody as any)?.applicationToken ??
        (startBody as any)?.applicationId ??
        (startBody as any)?.id ??
        (startBody as any)?.data?.applicationToken ??
        (startBody as any)?.data?.applicationId ??
        (startBody as any)?.data?.id;
      if (!appToken) {
        throw new Error('Application start response missing token');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bf_application_token', String(appToken));
        localStorage.removeItem('bf_application_pending_submit');
      }
      // eslint-disable-next-line no-console
      console.log('[otp] application.minted', { appToken });

      // 3. Off to Step 1.
      navigate('/apply/step-1');
    } catch (err: any) {
      setPhase('code');
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: 'block',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        maxWidth: 460,
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
      }}
    >
      {phase === 'phone' && (
        <>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6 }}>
            Mobile phone number
          </label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+15550000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', fontSize: 16,
              border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12,
            }}
          />
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button
            type="button"
            disabled={busy}
            onClick={sendCode}
            style={{
              width: '100%', padding: '14px 20px', fontSize: 17, fontWeight: 700,
              background: '#f59e0b', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer',
            }}
          >
            {busy ? 'Sending…' : 'Start Your Application →'}
          </button>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, marginBottom: 0 }}>
            We&apos;ll text you a one-time code to verify.
          </p>
        </>
      )}

      {(phase === 'code' || phase === 'submitting') && (
        <>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6 }}>
            Enter the code we sent to {phone}
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', fontSize: 18, letterSpacing: 4,
              border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12, textAlign: 'center',
            }}
          />
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button
            type="button"
            disabled={busy}
            onClick={verifyAndStart}
            style={{
              width: '100%', padding: '14px 20px', fontSize: 17, fontWeight: 700,
              background: '#f59e0b', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer',
            }}
          >
            {phase === 'submitting' ? 'Starting…' : 'Verify & Continue →'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { setPhase('phone'); setCode(''); setError(null); }}
            style={{
              marginTop: 10, background: 'transparent', border: 0,
              color: '#1e3a8a', fontSize: 13, cursor: 'pointer', padding: 0,
            }}
          >
            ← Use a different number
          </button>
        </>
      )}
    </div>
  );
}
