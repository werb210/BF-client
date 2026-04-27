// BF_PHONE_OTP_INLINE_v29 — Block 29
// Inline OTP form. Normalizes user input to E.164 before sending to Twilio.
// Display:  "(587) 888-1837"
// Submit:   "+15878881837"
//
// Why: Azure log showed `OTP ERROR: Invalid parameter 'To': 5878881837` —
// Twilio rejects anything that isn't E.164. v27 sent the raw input string,
// so a digits-only number like "5878881837" was rejected.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  ((import.meta as any).env?.VITE_API_URL) || 'https://server.boreal.financial';

type Phase = 'phone' | 'code' | 'submitting';

// Strip non-digits, drop a leading "1" country code, and return up to 10 digits.
function tenDigits(raw: string): string {
  const d = (raw || '').replace(/\D+/g, '');
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  if (d.length > 10) return d.slice(-10);
  return d;
}

// User-facing display format.
function formatDisplay(raw: string): string {
  const d = tenDigits(raw);
  if (d.length === 0) return '';
  if (d.length <= 3) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6, 10);
}

// API submission format. Returns null if not exactly 10 digits.
function toE164(raw: string): string | null {
  const d = tenDigits(raw);
  if (d.length !== 10) return null;
  return '+1' + d;
}

export default function PhoneOTPInline() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('phone');
  const [phoneDisplay, setPhoneDisplay] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cached so verify + application/start use the same canonical value.
  const [phoneE164, setPhoneE164] = useState<string>('');

  async function sendCode(): Promise<void> {
    setError(null);
    const e164 = toE164(phoneDisplay);
    if (!e164) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setPhoneE164(e164);
    setBusy(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[otp] start.send.e164', { phone: e164 });
      const res = await fetch(API_BASE + '/api/auth/otp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: e164, channel: 'sms' }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => String(res.status));
        // eslint-disable-next-line no-console
        console.warn('[otp] start.fail', { status: res.status, body });
        throw new Error('Could not send code. Please double-check your number and try again.');
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
    if (!phoneE164) {
      setError('Phone number missing — start over.');
      setPhase('phone');
      return;
    }
    setBusy(true);
    setPhase('submitting');
    try {
      // 1. Verify the OTP.
      // eslint-disable-next-line no-console
      console.log('[otp] verify.send', { phone: phoneE164 });
      const verifyRes = await fetch(API_BASE + '/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phoneE164, code }),
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

      // 2. Mint the application row.
      const startRes = await fetch(API_BASE + '/api/public/application/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ source: 'client_direct', phone: phoneE164 }),
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
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 24,
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
            autoComplete="tel"
            placeholder="(555) 000-0000"
            value={phoneDisplay}
            onChange={(e) => setPhoneDisplay(formatDisplay(e.target.value))}
            style={{
              width: '100%', padding: '12px 14px', fontSize: 16,
              border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button
            type="button"
            disabled={busy}
            onClick={sendCode}
            style={{
              width: '100%', padding: '14px 20px', fontSize: 17, fontWeight: 700,
              background: '#f59e0b', color: '#fff', border: 0, borderRadius: 8,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Sending…' : 'Start Your Application →'}
          </button>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, marginBottom: 0, textAlign: 'center' }}>
            We&apos;ll text you a one-time code to verify.
          </p>
        </>
      )}

      {(phase === 'code' || phase === 'submitting') && (
        <>
          <label style={{ display: 'block', fontSize: 14, color: '#334155', marginBottom: 6 }}>
            Enter the code we sent to {phoneDisplay}
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
              border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12,
              textAlign: 'center', boxSizing: 'border-box',
            }}
          />
          {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <button
            type="button"
            disabled={busy}
            onClick={verifyAndStart}
            style={{
              width: '100%', padding: '14px 20px', fontSize: 17, fontWeight: 700,
              background: '#f59e0b', color: '#fff', border: 0, borderRadius: 8,
              cursor: busy ? 'wait' : 'pointer',
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
              display: 'block', marginLeft: 'auto', marginRight: 'auto',
            }}
          >
            ← Use a different number
          </button>
        </>
      )}
    </div>
  );
}
