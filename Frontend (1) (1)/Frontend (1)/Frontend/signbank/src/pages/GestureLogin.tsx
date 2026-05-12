import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import type { Gesture } from '../../types';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './GestureLogin.css';
 
const RESERVED = { BACKSPACE: 'G007', SIGNIN: 'G006', FIST: 'G008' };
const MIN_PWD_GESTURES = 1;
const REVEAL_MS = 1000;
 
const ID_TO_EMOJI: Record<string, string> = {
  G001: '☝️', G002: '✌️', G003: '🤌', G004: '🤘',
  G005: '🖐️', G006: '👍', G007: '👎', G008: '✊', G009: '🤟',
};
const NAME_TO_EMOJI: Record<string, string> = {
  'One Finger': '☝️',               ONE_FINGER: '☝️',
  'Two Finger': '✌️',               TWO_FINGER: '✌️',
  'Three Finger': '🤌',             THREE_FINGER: '🤌',
  'Closed middle Two Finger': '🤘', CLOSED_MIDDLE_TWO_FINGER: '🤘',
  'Closed Mid Two': '🤘',
  'Open Palm': '🖐️',               OPEN_PALM: '🖐️',
  'Thumbs Up': '👍',                THUMBS_UP: '👍',
  'Thumbs Down': '👎',              THUMBS_DOWN: '👎',
  'Fist': '✊',                     FIST: '✊',
  'Middle Two Closed': '🤟',        MIDDLE_TWO_CLOSED: '🤟',
};
 
function resolveEmoji(g: Gesture): string {
  const s = g.gestureSymbol;
  if (s && /\p{Emoji}/u.test(s)) return s;
  return ID_TO_EMOJI[g.gestureId] ?? NAME_TO_EMOJI[g.gestureName] ?? '🤚';
}
 
const DIGIT_GESTURES: [string, string, string][] = [
  ['1', '☝️', 'One Finger'],
  ['2', '✌️', 'Two Finger'],
  ['3', '🤌', 'Three Finger'],
  ['4', '🤘', 'Closed Mid Two'],
  ['5', '🖐️', 'Open Palm'],
];
 
const FALLBACK_GESTURES: Gesture[] = [
  { gestureId: 'G001', gestureName: 'One Finger',               gestureSymbol: '☝️' },
  { gestureId: 'G002', gestureName: 'Two Finger',               gestureSymbol: '✌️' },
  { gestureId: 'G003', gestureName: 'Three Finger',             gestureSymbol: '🤌' },
  { gestureId: 'G004', gestureName: 'Closed middle Two Finger', gestureSymbol: '🤘' },
  { gestureId: 'G005', gestureName: 'Open Palm',                gestureSymbol: '🖐️' },
  { gestureId: 'G006', gestureName: 'Thumbs Up',                gestureSymbol: '👍' },
  { gestureId: 'G007', gestureName: 'Thumbs Down',              gestureSymbol: '👎' },
  { gestureId: 'G008', gestureName: 'Fist',                     gestureSymbol: '✊' },
  { gestureId: 'G009', gestureName: 'Middle Two Closed',        gestureSymbol: '🤟' },
];
 
interface FoundUser {
  userId: string; roleId: string; roleName: string; passwordSet: boolean;
}
 
 
export default function GestureLogin() {
  const [step,        setStep]        = useState<'username' | 'password'>('username');
  const [digits,      setDigits]      = useState<string[]>([]);
  const [foundUser,   setFoundUser]   = useState<FoundUser | null>(null);
  const [gestures,    setGestures]    = useState<Gesture[]>(FALLBACK_GESTURES);
  const [pwdEntries,  setPwdEntries]  = useState<{ id: string; masked: boolean }[]>([]);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [gestureHint, setGestureHint] = useState('');
 
  const { login } = useAuth();
  const navigate  = useNavigate();
  const maskTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const stepRef    = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => () => { maskTimers.current.forEach(t => clearTimeout(t)); }, []);
 
  const passwordGestures = gestures.filter(
    g => g.gestureId !== RESERVED.BACKSPACE &&
         g.gestureId !== RESERVED.SIGNIN &&
         g.gestureId !== RESERVED.FIST
  );
  const getById = (id: string) => gestures.find(g => g.gestureId === id);
  const fistGesture = getById(RESERVED.FIST);
 
  const addDigit       = useCallback((d: string) => {
    if (d < '1' || d > '5') return;
    setDigits(p => p.length < 4 ? [...p, d] : p);
  }, []);
  const backspaceDigit = useCallback(() => setDigits(p => p.slice(0, -1)), []);
 
  const handleUserIdSubmit = useCallback(async () => {
    const id = digits.join('');
    if (id.length !== 4) { setError('Enter 4-digit User ID'); return; }
    setLoading(true); setError('');
 
    try {
      const res  = await apiClient.post<string>('/api/auth/login', null, { params: { userId: id } });
      const body = (typeof res.data === 'string' ? res.data : String(res.data)).trim();
 
      if (body === 'FIRST_LOGIN' || body === 'PASSWORD_REQUIRED') {
        let roleId = 'R001'; let roleName = 'operator';
        try {
          const ur = await apiClient.get<any[]>('/api/admin/users');
          const u  = ur.data.find((x: any) => x.userId === id);
          roleId   = u?.roleId   ?? 'R001';
          roleName = (u?.roleName ?? 'operator').toLowerCase();
        } catch {  }
 
        if (roleName.includes('admin')) { setError('Use Admin Login for admin accounts'); return; }
 
        try {
          const gr  = await apiClient.get<Gesture[]>('/api/admin/gestures');
          const fixed = gr.data.map(g => ({ ...g, gestureSymbol: resolveEmoji(g) }));
          setGestures(fixed.length > 0 ? fixed : FALLBACK_GESTURES);
        } catch { setGestures(FALLBACK_GESTURES); }
 
        setFoundUser({ userId: id, roleId, roleName, passwordSet: body === 'PASSWORD_REQUIRED' });
 
        if (body === 'FIRST_LOGIN') {
          login({
            userId: id, username: id, email: '',
            roleId, roleName, createdAt: '', passwordSet: false,
          }, '');
          navigate('/set-password');
          return;
        }
 
        setStep('password');
        setPwdEntries([]);
      } else {
        setError('User ID not found');
      }
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setError('User ID not found');
      else if (s === 401) setError('Access denied — use Admin Login');
      else setError('User ID not found');
    } finally { setLoading(false); }
  }, [digits, login, navigate]);
 
  const addGesture = useCallback((gestureId: string) => {
    setError('');
    setPwdEntries(prev => {
      const idx = prev.length;
      const t = setTimeout(() => {
        setPwdEntries(p => p.map((e, i) => i === idx ? { ...e, masked: true } : e));
      }, REVEAL_MS);
      maskTimers.current.set(idx, t);
      return [...prev, { id: gestureId, masked: false }];
    });
  }, []);
 
  const backspacePwd = useCallback(() => {
    setPwdEntries(prev => {
      const last = prev.length - 1; if (last < 0) return prev;
      clearTimeout(maskTimers.current.get(last)); maskTimers.current.delete(last);
      return prev.slice(0, -1);
    });
  }, []);
 
  const handlePasswordSubmit = useCallback(async () => {
    if (!foundUser) return;
    if (pwdEntries.length < MIN_PWD_GESTURES) {
      setError('Enter at least 1 gesture'); return;
    }
    setLoading(true); setError('');
 
    // Build gesture sequence string
    const gestureSequence = pwdEntries.map(e => e.id).join('-');
 
    try {
      const res = await apiClient.post<string>(
        '/api/auth/login', null,
        { params: { userId: foundUser.userId, password: gestureSequence } }
      );
      const token = (typeof res.data === 'string' ? res.data : String(res.data)).trim();
 
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role    = (payload.role ?? '').toString().toLowerCase();
 
      login({
        userId: foundUser.userId, username: foundUser.userId, email: '',
        roleId: foundUser.roleId, roleName: foundUser.roleName,
        createdAt: '', passwordSet: true,
      }, token);
 
      if (role.includes('operator')) navigate('/operator/dashboard');
      else navigate('/viewer/dashboard');
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 401) setError('Wrong gesture password. Try again.');
      else setError('Login failed. Please retry.');
    } finally { setLoading(false); }
  }, [foundUser, pwdEntries, login, navigate]);
 
  const goBack = useCallback(() => {
    setStep('username'); setDigits([]); setPwdEntries([]);
    setFoundUser(null); setError('');
    maskTimers.current.forEach(t => clearTimeout(t)); maskTimers.current.clear();
  }, []);
 
  // ── Gesture camera handler
  const handleGesture = useCallback((evt: GestureEvent) => {
    const cur = stepRef.current;
    if (cur === 'username') {
      if (evt.type === 'DIGIT')      { setGestureHint(`${evt.value} finger`); addDigit(evt.value); }
      if (evt.type === 'THUMB_UP')   { setGestureHint('👍 Confirm ID'); handleUserIdSubmit(); }
      if (evt.type === 'THUMB_DOWN') { setGestureHint('👎 Backspace'); backspaceDigit(); }
    }
    if (cur === 'password') {
      if (evt.type === 'GESTURE_ID') { setGestureHint(`Gesture: ${evt.id}`); addGesture(evt.id); }
      if (evt.type === 'THUMB_UP')   { setGestureHint('👍 Submit'); handlePasswordSubmit(); }
      if (evt.type === 'THUMB_DOWN') { setGestureHint('👎 Backspace'); backspacePwd(); }
      if (evt.type === 'FIST')       { setGestureHint('✊ Back'); goBack(); }
    }
  }, [addDigit, backspaceDigit, handleUserIdSubmit, addGesture, backspacePwd, handlePasswordSubmit, goBack]);
 
  // ── Render
  return (
    <div className="gesture-login-page">
      <div className="gesture-login-header">
        {step === 'password' && (
          <button className="back-gesture-btn" onClick={goBack}>
            ← Back <span className="back-gesture-hint">{fistGesture?.gestureSymbol ?? '✊'} Fist</span>
          </button>
        )}
        <div className="brand-center">
          <div className="brand-name">SignBank Enterprise</div>
          <div className="brand-tagline">Gesture Driven Smart Interaction Platform</div>
        </div>
        <div />
      </div>
 
      <div className="gesture-login-body">
        <div className="gesture-login-card">
          {gestureHint && <div className="gesture-hint-bar">{gestureHint}</div>}
 
          {}
          {step === 'username' && (
            <>
              <div className="card-badge">Login</div>
              <h2>Enter User ID</h2>
              <p className="hint">Show 1–5 fingers for each digit · 👍 Confirm · 👎 Backspace</p>
 
              <div className="digit-boxes">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`digit-box ${digits[i] ? 'filled' : ''}`}>
                    {digits[i] || ''}
                  </div>
                ))}
              </div>
 
              <div className="gesture-digit-map">
                {DIGIT_GESTURES.map(([d, sym, name]) => (
                  <button key={d} className="digit-gesture-btn" onClick={() => addDigit(d)}>
                    <span className="dg-sym">{sym}</span>
                    <span className="dg-label">{d} — {name}</span>
                  </button>
                ))}
                <button className="digit-gesture-btn action-btn-reserved" onClick={backspaceDigit}>
                  <span className="dg-sym">👎</span>
                  <span className="dg-label">Backspace — Thumbs Down</span>
                </button>
              </div>
 
              {error && <p className="error-msg">{error}</p>}
              <button
                className="sign-in-gesture-btn"
                onClick={handleUserIdSubmit}
                disabled={loading || digits.length < 4}
              >
                {loading ? 'Checking…' : <>Next <span className="btn-gesture-hint">👍 Thumbs Up</span></>}
              </button>
              <p className="demo-hint">Demo: <strong>1111</strong> (operator) · <strong>2111</strong> (viewer)</p>
            </>
          )}
 
          {}
          {step === 'password' && (
            <>
              <div className="card-badge">Password</div>
              <h2>Gesture Password</h2>
              <p className="welcome-text">Welcome, <strong>{foundUser?.userId}</strong></p>
              <p className="hint">Show gestures for password · 👍 Submit · 👎 Backspace · ✊ Back</p>
 
              <div className="pwd-field">
                <div className="pwd-dots-row">
                  {pwdEntries.length === 0
                    ? <span className="pwd-placeholder">Show gestures...</span>
                    : pwdEntries.map((e, i) => (
                        <span key={i} className={`pwd-token ${e.masked ? 'masked' : 'revealed'}`}>
                          {e.masked
                            ? '●'
                            : resolveEmoji(getById(e.id) ?? { gestureId: e.id, gestureName: '', gestureSymbol: '' })}
                        </span>
                      ))
                  }
                </div>
                <span className="pwd-count">{pwdEntries.length} gestures</span>
              </div>
 
              <div className="available-gestures">
                {passwordGestures.map(g => (
                  <button key={g.gestureId} className="avail-gesture-btn"
                    onClick={() => addGesture(g.gestureId)} title={g.gestureName}>
                    <span className="ag-sym">{resolveEmoji(g)}</span>
                    <span className="ag-name">{g.gestureName}</span>
                  </button>
                ))}
              </div>
 
              <div className="pwd-action-row">
                <button className="pwd-action-btn backspace" onClick={backspacePwd}>
                  👎 Backspace
                </button>
                <button className="pwd-action-btn clear"
                  onClick={() => {
                    maskTimers.current.forEach(t => clearTimeout(t));
                    maskTimers.current.clear();
                    setPwdEntries([]);
                  }}>
                  ✕ Clear
                </button>
              </div>
 
              {error && <p className="error-msg">{error}</p>}
              <button
                className="sign-in-gesture-btn"
                onClick={handlePasswordSubmit}
                disabled={pwdEntries.length < MIN_PWD_GESTURES || loading}
              >
                {loading ? 'Verifying…' : <>Submit <span className="btn-gesture-hint">👍 Thumbs Up</span></>}
              </button>
            </>
          )}
        </div>
 
        <GestureCamera onGesture={handleGesture} />
      </div>
    </div>
  );
}