import { useState, useEffect } from 'react';
import Head from 'next/head';

const MS_BLUE = '#2563EB';
const MS_DARK = '#0a0a0a';

export default function AdminPage() {
  const [authed,      setAuthed]      = useState(false);
  const [password,    setPassword]    = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [holidays,    setHolidays]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState('');
  const [toast,       setToast]       = useState('');

  const [newFrom,     setNewFrom]     = useState('');
  const [newTo,       setNewTo]       = useState('');
  const [newLabel,    setNewLabel]    = useState('');
  const [addError,    setAddError]    = useState('');

  const [statusInfo,  setStatusInfo]  = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(''), 3200);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', password }),
      });
      if (res.ok) {
        setAuthed(true);
        sessionStorage.setItem('rf_admin_pw', password);
      } else {
        setAuthError('Incorrect password. Try again.');
      }
    } catch {
      setAuthError('Could not connect. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('rf_admin_pw');
    if (saved) {
      setPassword(saved);
      // Auto-verify
      fetch('/api/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', password: saved }),
      }).then(r => { if (r.ok) setAuthed(true); });
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch('/api/holiday', {
      headers: { 'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password },
    })
      .then(r => r.json())
      .then(data => {
        setHolidays(data.holidays || []);
        setStatusInfo(data.status || null);
      })
      .finally(() => setLoading(false));
  }, [authed]);

  const addHoliday = async () => {
    setAddError('');
    if (!newFrom || !newTo) { setAddError('Please set both a start and end date.'); return; }
    if (new Date(newTo) < new Date(newFrom)) { setAddError('End date must be after start date.'); return; }
    const newEntry = {
      id: Date.now().toString(),
      from: newFrom,
      to: newTo,
      label: newLabel.trim() || 'Holiday closure',
    };
    const updated = [...holidays, newEntry];
    setSaving('add');
    try {
      const res = await fetch('/api/holiday', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password,
        },
        body: JSON.stringify({ holidays: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || updated);
        setStatusInfo(data.status || null);
        setNewFrom(''); setNewTo(''); setNewLabel('');
        showToast('Holiday period saved successfully.');
      } else {
        showToast('Failed to save. Try again.', true);
      }
    } catch {
      showToast('Network error. Try again.', true);
    } finally {
      setSaving('');
    }
  };

  const removeHoliday = async (id) => {
    const updated = holidays.filter(h => h.id !== id);
    setSaving(id);
    try {
      const res = await fetch('/api/holiday', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password,
        },
        body: JSON.stringify({ holidays: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || updated);
        setStatusInfo(data.status || null);
        showToast('Holiday period removed.');
      } else {
        showToast('Failed to remove. Try again.', true);
      }
    } catch {
      showToast('Network error. Try again.', true);
    } finally {
      setSaving('');
    }
  };

  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const isActive = (h) => {
    const now = new Date();
    const from = new Date(h.from + 'T00:00:00');
    const to   = new Date(h.to   + 'T23:59:59');
    return now >= from && now <= to;
  };

  const isUpcoming = (h) => {
    const now = new Date();
    const from = new Date(h.from + 'T00:00:00');
    return from > now;
  };

  // Sort: active first, then upcoming, then past
  const sortedHolidays = [...holidays].sort((a, b) => {
    const scoreA = isActive(a) ? 0 : isUpcoming(a) ? 1 : 2;
    const scoreB = isActive(b) ? 0 : isUpcoming(b) ? 1 : 2;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return new Date(a.from) - new Date(b.from);
  });

  const today = new Date().toISOString().split('T')[0];

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head>
          <title>Admin — Root + Fuel</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div style={{
          minHeight: '100vh',
          background: MS_DARK,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
          padding: '24px',
        }}>
          {/* MS Logo */}
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <img src="/ms-logo.png" alt="Munro Studio" style={{ height: '52px', marginBottom: '12px' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Site Management
            </p>
          </div>

          <div style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '40px',
            width: '100%',
            maxWidth: '400px',
          }}>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#fff',
              fontSize: '22px',
              fontWeight: 600,
              marginBottom: '6px',
            }}>Root + Fuel Admin</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>
              Holiday & closure management
            </p>

            <form onSubmit={handleAuth}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${authError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px',
                  padding: '13px 16px',
                  color: '#fff',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  marginBottom: authError ? '8px' : '24px',
                }}
              />
              {authError && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{authError}</p>
              )}
              <button
                type="submit"
                disabled={authLoading || !password}
                style={{
                  width: '100%',
                  background: authLoading ? 'rgba(37,99,235,0.5)' : MS_BLUE,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: authLoading || !password ? 'not-allowed' : 'pointer',
                }}
              >
                {authLoading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px', marginTop: '32px' }}>
            Powered by <span style={{ color: MS_BLUE }}>Munro Studio</span> · munrostudio.co.uk
          </p>
        </div>
      </>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Admin — Root + Fuel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#f8f7f5',
        fontFamily: "'DM Sans', sans-serif",
        color: '#1a1a1a',
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            background: toast.isError ? '#ef4444' : '#16a34a',
            color: '#fff', padding: '12px 20px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.2s ease',
          }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <header style={{
          background: MS_DARK,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/ms-logo.png" alt="Munro Studio" style={{ height: '32px' }} />
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
            }}>Root + Fuel Admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/"
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                textDecoration: 'none',
                padding: '6px 14px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            >
              ← Back to site
            </a>
            <button
              onClick={() => { setAuthed(false); sessionStorage.removeItem('rf_admin_pw'); }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Page title */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '6px',
            }}>Holiday & Closure Management</h1>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>
              Schedule closures and the website will automatically lock ordering for those dates.
            </p>
          </div>

          {/* Status banner */}
          {statusInfo && (
            <div style={{
              background: statusInfo.locked ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${statusInfo.locked ? '#fecaca' : '#bbf7d0'}`,
              borderRadius: '14px',
              padding: '18px 22px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: statusInfo.locked ? '#ef4444' : '#22c55e',
                flexShrink: 0,
              }} />
              <div>
                <p style={{
                  fontWeight: 600,
                  color: statusInfo.locked ? '#b91c1c' : '#15803d',
                  fontSize: '15px',
                  marginBottom: '2px',
                }}>
                  {statusInfo.locked ? 'Ordering is currently CLOSED' : 'Ordering is currently OPEN'}
                </p>
                <p style={{ color: statusInfo.locked ? '#dc2626' : '#16a34a', fontSize: '13px' }}>
                  {statusInfo.reason}
                </p>
              </div>
            </div>
          )}

          {/* Add new holiday */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '28px',
          }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '17px',
              fontWeight: 600,
              marginBottom: '20px',
            }}>Add a closure period</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Closure starts</label>
                <input
                  type="date"
                  value={newFrom}
                  min={today}
                  onChange={e => setNewFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Closure ends</label>
                <input
                  type="date"
                  value={newTo}
                  min={newFrom || today}
                  onChange={e => setNewTo(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Label (optional)</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Summer holiday, Christmas break…"
                style={inputStyle}
              />
            </div>

            {addError && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px' }}>{addError}</p>
            )}

            {newFrom && newTo && new Date(newTo) >= new Date(newFrom) && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '14px',
                color: '#1e40af',
              }}>
                The website will be closed from <strong>{formatDate(newFrom)}</strong> to <strong>{formatDate(newTo)}</strong> (inclusive).
              </div>
            )}

            <button
              onClick={addHoliday}
              disabled={saving === 'add'}
              style={{
                background: saving === 'add' ? 'rgba(37,99,235,0.5)' : MS_BLUE,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: saving === 'add' ? 'not-allowed' : 'pointer',
              }}
            >
              {saving === 'add' ? 'Saving…' : '+ Add closure period'}
            </button>
          </div>

          {/* Holidays list */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '17px',
                fontWeight: 600,
              }}>Scheduled closures</h2>
              <span style={{
                background: '#f3f4f6',
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '13px',
                color: '#6b7280',
                fontWeight: 500,
              }}>
                {holidays.length} {holidays.length === 1 ? 'period' : 'periods'}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                Loading closures…
              </div>
            ) : sortedHolidays.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌴</div>
                <p style={{ color: '#6b7280', fontSize: '15px' }}>No closures scheduled yet.</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                  Add a period above to close the website automatically.
                </p>
              </div>
            ) : (
              <div>
                {sortedHolidays.map((h, i) => {
                  const active   = isActive(h);
                  const upcoming = isUpcoming(h);
                  const past     = !active && !upcoming;
                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '18px 28px',
                        borderBottom: i < sortedHolidays.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        opacity: past ? 0.5 : 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>{h.label}</span>
                            {active && (
                              <span style={{
                                background: '#fef2f2', color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '2px 10px', borderRadius: '20px',
                                fontSize: '11px', fontWeight: 600,
                                letterSpacing: '0.5px', textTransform: 'uppercase',
                              }}>Active now</span>
                            )}
                            {upcoming && (
                              <span style={{
                                background: '#eff6ff', color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                padding: '2px 10px', borderRadius: '20px',
                                fontSize: '11px', fontWeight: 600,
                                letterSpacing: '0.5px', textTransform: 'uppercase',
                              }}>Upcoming</span>
                            )}
                            {past && (
                              <span style={{
                                background: '#f9fafb', color: '#9ca3af',
                                border: '1px solid #e5e7eb',
                                padding: '2px 10px', borderRadius: '20px',
                                fontSize: '11px', fontWeight: 500,
                              }}>Past</span>
                            )}
                          </div>
                          <p style={{ fontSize: '13px', color: '#6b7280' }}>
                            {formatDate(h.from)} → {formatDate(h.to)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeHoliday(h.id)}
                        disabled={saving === h.id}
                        style={{
                          background: 'transparent',
                          border: '1px solid #fecaca',
                          color: saving === h.id ? '#fca5a5' : '#dc2626',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          fontFamily: 'inherit',
                          cursor: saving === h.id ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {saving === h.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            padding: '24px 28px',
            marginTop: '28px',
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '14px',
              color: '#374151',
            }}>How it works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['🔒', 'During a closure period, the website locks ordering automatically — customers see a friendly "we\'re on a break" message.'],
                ['📅', 'The existing Sat–Tue weekly lock still applies on top of any holidays you schedule here.'],
                ['✅', 'When the closure ends, the site reopens on its own — no action needed from you.'],
                ['🗑️', 'You can remove a scheduled closure at any time, even while it\'s active.'],
              ].map(([icon, text], i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#4b5563' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
                  <span style={{ lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer style={{
          background: MS_DARK,
          padding: '20px 28px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
            Built &amp; maintained by{' '}
            <a href="https://munrostudio.co.uk" target="_blank" rel="noreferrer" style={{ color: MS_BLUE, textDecoration: 'none' }}>
              Munro Studio
            </a>
            {' '}· Glasgow Web Design · £55/month
          </p>
        </footer>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
          input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        `}</style>
      </div>
    </>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '7px',
};

const inputStyle = {
  width: '100%',
  background: '#f9fafb',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  outline: 'none',
  boxSizing: 'border-box',
};