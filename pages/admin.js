import { useState, useEffect } from 'react';
import Head from 'next/head';

const MS_BLUE = '#2563EB';
const MS_DARK = '#0a0a0a';

const VALID_CATEGORIES = [
  'Starters', 'Mains', 'Desserts', 'Overnight Oats',
  'Poke Bowls', 'Grab & Go', 'Specials',
];

const EMPTY_ITEM = { category: 'Mains', name: '', description: '', price: '', image: '', available: true };

export default function AdminPage() {
  const [authed,      setAuthed]      = useState(false);
  const [password,    setPassword]    = useState('');
  const [authError,   setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'menu'

  // ── Holidays state ────────────────────────────────────────────────────────
  const [holidays,    setHolidays]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState('');
  const [toast,       setToast]       = useState('');
  const [newFrom,     setNewFrom]     = useState('');
  const [newTo,       setNewTo]       = useState('');
  const [newLabel,    setNewLabel]    = useState('');
  const [addError,    setAddError]    = useState('');
  const [statusInfo,  setStatusInfo]  = useState(null);

  // ── Collection override state ─────────────────────────────────────────────
  const [collOverride,       setCollOverride]       = useState(null);
  const [collOverrideLoaded, setCollOverrideLoaded] = useState(false);
  const [collLabel,          setCollLabel]          = useState('');
  const [collSaving,         setCollSaving]         = useState(false);

  // ── Menu state ────────────────────────────────────────────────────────────
  const [menuItems,    setMenuItems]    = useState([]);
  const [menuLoading,  setMenuLoading]  = useState(false);
  const [menuFilter,   setMenuFilter]   = useState('All');
  const [editingItem,  setEditingItem]  = useState(null);  // item being edited (includes rowNumber)
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newItem,      setNewItem]      = useState(EMPTY_ITEM);
  const [menuSaving,   setMenuSaving]   = useState('');    // rowNumber | 'add' | ''

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(''), 3200);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
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
      fetch('/api/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', password: saved }),
      }).then(r => { if (r.ok) setAuthed(true); });
    }
  }, []);

  // ── Load holidays + collection override ───────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    const pw = sessionStorage.getItem('rf_admin_pw') || password;

    fetch('/api/holiday', { headers: { 'x-admin-password': pw } })
      .then(r => r.json())
      .then(data => {
        setHolidays(data.holidays || []);
        setStatusInfo(data.status || null);
      })
      .finally(() => setLoading(false));

    fetch('/api/slot-override')
      .then(r => r.json())
      .then(data => {
        setCollOverride(data.override || false);
        if (data.override?.label) setCollLabel(data.override.label);
        setCollOverrideLoaded(true);
      })
      .catch(() => setCollOverrideLoaded(true));
  }, [authed]);

  // ── Load menu items ───────────────────────────────────────────────────────
  const loadMenu = async () => {
    setMenuLoading(true);
    const pw = sessionStorage.getItem('rf_admin_pw') || password;
    try {
      const res = await fetch('/api/menu-admin', { headers: { 'x-admin-password': pw } });
      const data = await res.json();
      setMenuItems(data.items || []);
    } catch {
      showToast('Failed to load menu items.', true);
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    if (authed && activeTab === 'menu') loadMenu();
  }, [authed, activeTab]);

  // ── Holiday CRUD ──────────────────────────────────────────────────────────
  const addHoliday = async () => {
    setAddError('');
    if (!newFrom || !newTo) { setAddError('Please set both a start and end date.'); return; }
    if (new Date(newTo) < new Date(newFrom)) { setAddError('End date must be after start date.'); return; }
    const newEntry = { id: Date.now().toString(), from: newFrom, to: newTo, label: newLabel.trim() || 'Holiday closure' };
    const updated = [...holidays, newEntry];
    setSaving('add');
    try {
      const res = await fetch('/api/holiday', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password },
        body: JSON.stringify({ holidays: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || updated);
        setStatusInfo(data.status || null);
        setNewFrom(''); setNewTo(''); setNewLabel('');
        showToast('Holiday period saved successfully.');
      } else { showToast('Failed to save. Try again.', true); }
    } catch { showToast('Network error. Try again.', true); }
    finally { setSaving(''); }
  };

  const removeHoliday = async (id) => {
    const updated = holidays.filter(h => h.id !== id);
    setSaving(id);
    try {
      const res = await fetch('/api/holiday', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password },
        body: JSON.stringify({ holidays: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || updated);
        setStatusInfo(data.status || null);
        showToast('Holiday period removed.');
      } else { showToast('Failed to remove. Try again.', true); }
    } catch { showToast('Network error. Try again.', true); }
    finally { setSaving(''); }
  };

  // ── Collection override CRUD ──────────────────────────────────────────────
  const disableCollection = async () => {
    setCollSaving(true);
    try {
      const res = await fetch('/api/slot-override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password },
        body: JSON.stringify({ disabled: true, label: collLabel.trim() || 'Collection unavailable this week' }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollOverride(data.override);
        showToast('Collection disabled for this week.');
      } else { showToast('Failed to save. Try again.', true); }
    } catch { showToast('Network error. Try again.', true); }
    finally { setCollSaving(false); }
  };

  const enableCollection = async () => {
    setCollSaving(true);
    try {
      const res = await fetch('/api/slot-override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('rf_admin_pw') || password },
        body: JSON.stringify({ disabled: false }),
      });
      if (res.ok) {
        setCollOverride(false);
        setCollLabel('');
        showToast('Collection re-enabled.');
      } else { showToast('Failed to re-enable. Try again.', true); }
    } catch { showToast('Network error. Try again.', true); }
    finally { setCollSaving(false); }
  };

  // ── Menu CRUD ─────────────────────────────────────────────────────────────
  const addMenuItem = async () => {
    if (!newItem.name.trim()) { showToast('Item name is required.', true); return; }
    setMenuSaving('add');
    const pw = sessionStorage.getItem('rf_admin_pw') || password;
    try {
      const res = await fetch('/api/menu-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
        setNewItem(EMPTY_ITEM);
        setShowAddForm(false);
        showToast('Item added to menu.');
      } else { showToast('Failed to add item.', true); }
    } catch { showToast('Network error.', true); }
    finally { setMenuSaving(''); }
  };

  const saveEditItem = async () => {
    if (!editingItem?.name?.trim()) { showToast('Item name is required.', true); return; }
    setMenuSaving(editingItem.rowNumber);
    const pw = sessionStorage.getItem('rf_admin_pw') || password;
    try {
      const res = await fetch('/api/menu-admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
        setEditingItem(null);
        showToast('Item updated.');
      } else { showToast('Failed to update item.', true); }
    } catch { showToast('Network error.', true); }
    finally { setMenuSaving(''); }
  };

  const toggleAvailable = async (item) => {
    const pw = sessionStorage.getItem('rf_admin_pw') || password;
    setMenuSaving(item.rowNumber);
    try {
      const res = await fetch('/api/menu-admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify({ ...item, available: !item.available }),
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
        showToast(`"${item.name}" marked as ${!item.available ? 'available' : 'unavailable'}.`);
      } else { showToast('Failed to update.', true); }
    } catch { showToast('Network error.', true); }
    finally { setMenuSaving(''); }
  };

  const deleteMenuItem = async (item) => {
    if (!confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) return;
    const pw = sessionStorage.getItem('rf_admin_pw') || password;
    setMenuSaving(item.rowNumber);
    try {
      const res = await fetch('/api/menu-admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify({ rowNumber: item.rowNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
        showToast(`"${item.name}" removed.`);
      } else { showToast('Failed to delete item.', true); }
    } catch { showToast('Network error.', true); }
    finally { setMenuSaving(''); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const isActive   = h => { const n=new Date(); return n>=new Date(h.from+'T00:00:00') && n<=new Date(h.to+'T23:59:59'); };
  const isUpcoming = h => new Date(h.from+'T00:00:00') > new Date();
  const sortedHolidays = [...holidays].sort((a,b) => {
    const sa=isActive(a)?0:isUpcoming(a)?1:2, sb=isActive(b)?0:isUpcoming(b)?1:2;
    if(sa!==sb) return sa-sb;
    return new Date(a.from)-new Date(b.from);
  });
  const today = new Date().toISOString().split('T')[0];

  const filteredMenu = menuFilter === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === menuFilter);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head>
          <title>Admin — Root + Fuel</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div style={{ minHeight:'100vh', background:MS_DARK, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans', sans-serif", padding:'24px' }}>
          <div style={{ marginBottom:'40px', textAlign:'center' }}>
            <img src="/ms-logo.png" alt="Munro Studio" style={{ height:'52px', marginBottom:'12px' }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px', letterSpacing:'2px', textTransform:'uppercase' }}>Site Management</p>
          </div>
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'40px', width:'100%', maxWidth:'400px' }}>
            <h1 style={{ fontFamily:"'Space Grotesk', sans-serif", color:'#fff', fontSize:'22px', fontWeight:600, marginBottom:'6px' }}>Root + Fuel Admin</h1>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'14px', marginBottom:'32px' }}>Holiday & menu management</p>
            <form onSubmit={handleAuth}>
              <label style={{ display:'block', fontSize:'12px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'8px' }}>Admin Password</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Enter password" autoFocus
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:`1px solid ${authError?'#ef4444':'rgba(255,255,255,0.1)'}`, borderRadius:'10px', padding:'13px 16px', color:'#fff', fontSize:'15px', fontFamily:'inherit', outline:'none', marginBottom:authError?'8px':'24px', boxSizing:'border-box' }}
              />
              {authError && <p style={{ color:'#ef4444', fontSize:'13px', marginBottom:'16px' }}>{authError}</p>}
              <button type="submit" disabled={authLoading||!password} style={{ width:'100%', background:authLoading?'rgba(37,99,235,0.5)':MS_BLUE, color:'#fff', border:'none', borderRadius:'10px', padding:'14px', fontSize:'15px', fontWeight:600, fontFamily:'inherit', cursor:authLoading||!password?'not-allowed':'pointer' }}>
                {authLoading?'Signing in…':'Sign In →'}
              </button>
            </form>
          </div>
          <p style={{ color:'rgba(255,255,255,0.15)', fontSize:'12px', marginTop:'32px' }}>
            Powered by <span style={{ color:MS_BLUE }}>Munro Studio</span> · munrostudio.co.uk
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
      <div style={{ minHeight:'100vh', background:'#f8f7f5', fontFamily:"'DM Sans', sans-serif", color:'#1a1a1a' }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:'fixed', top:'20px', right:'20px', left:'20px', zIndex:9999, background:toast.isError?'#ef4444':'#16a34a', color:'#fff', padding:'12px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:500, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', animation:'fadeIn 0.2s ease', maxWidth:'400px', margin:'0 auto' }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <header style={{ background:MS_DARK, padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
            <img src="/ms-logo.png" alt="Munro Studio" style={{ height:'28px', flexShrink:0 }} />
            <div style={{ width:'1px', height:'20px', background:'rgba(255,255,255,0.1)', flexShrink:0 }} />
            <span style={{ fontFamily:"'Space Grotesk', sans-serif", color:'#fff', fontSize:'14px', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              Root + Fuel
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
            <a href="/" style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px', textDecoration:'none', padding:'5px 10px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', whiteSpace:'nowrap' }}>
              ← Site
            </a>
            <button onClick={()=>{ setAuthed(false); sessionStorage.removeItem('rf_admin_pw'); }} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', padding:'5px 10px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              Sign out
            </button>
          </div>
        </header>

        {/* Tab bar */}
        <div style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.08)', position:'sticky', top:'60px', zIndex:99 }}>
          <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex' }}>
            {[
              { id:'schedule', label:'Schedule & Closures' },
              { id:'menu',     label:'Menu Items' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ flex:1, padding:'14px 8px', background:'transparent', border:'none', borderBottom:`2px solid ${activeTab===tab.id?MS_BLUE:'transparent'}`, color:activeTab===tab.id?MS_BLUE:'#6b7280', fontSize:'14px', fontWeight:activeTab===tab.id?600:400, fontFamily:"'DM Sans', sans-serif", cursor:'pointer', transition:'all 0.15s' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main style={{ maxWidth:'900px', margin:'0 auto', padding:'24px 16px 80px' }}>

          {/* ── SCHEDULE TAB ────────────────────────────────────────────── */}
          {activeTab === 'schedule' && (
            <>
              {/* Status banner */}
              {statusInfo && (
                <div style={{ background:statusInfo.locked?'#fef2f2':'#f0fdf4', border:`1px solid ${statusInfo.locked?'#fecaca':'#bbf7d0'}`, borderRadius:'14px', padding:'16px 20px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:statusInfo.locked?'#ef4444':'#22c55e', flexShrink:0 }} />
                  <div>
                    <p style={{ fontWeight:600, color:statusInfo.locked?'#b91c1c':'#15803d', fontSize:'14px', marginBottom:'2px' }}>
                      {statusInfo.locked?'Ordering is currently CLOSED':'Ordering is currently OPEN'}
                    </p>
                    <p style={{ color:statusInfo.locked?'#dc2626':'#16a34a', fontSize:'13px' }}>{statusInfo.reason}</p>
                  </div>
                </div>
              )}

              {/* Collection override */}
              <div style={{ background:'#fff', border:`1px solid ${collOverride?.disabled?'#fecaca':'rgba(0,0,0,0.08)'}`, borderRadius:'16px', padding:'24px', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
                  <div>
                    <h2 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'16px', fontWeight:600, marginBottom:'3px' }}>Collection Availability</h2>
                    <p style={{ color:'#6b7280', fontSize:'13px' }}>Temporarily disable collection for a week.</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', background:collOverride?.disabled?'#fef2f2':'#f0fdf4', border:`1px solid ${collOverride?.disabled?'#fecaca':'#bbf7d0'}`, borderRadius:'100px', padding:'5px 12px', flexShrink:0 }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:collOverride?.disabled?'#ef4444':'#22c55e' }} />
                    <span style={{ fontSize:'12px', fontWeight:600, color:collOverride?.disabled?'#b91c1c':'#15803d' }}>
                      {collOverride?.disabled?'OFF':'ON'}
                    </span>
                  </div>
                </div>

                {collOverride?.disabled ? (
                  <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                    <div>
                      <p style={{ fontSize:'13px', fontWeight:600, color:'#b91c1c', marginBottom:'2px' }}>🚫 {collOverride.label}</p>
                      <p style={{ fontSize:'12px', color:'#dc2626' }}>Customers cannot select collection at checkout.</p>
                    </div>
                    <button onClick={enableCollection} disabled={collSaving} style={{ background:'#fff', border:'1px solid #fecaca', color:'#dc2626', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:600, fontFamily:'inherit', cursor:collSaving?'not-allowed':'pointer', opacity:collSaving?0.6:1, flexShrink:0 }}>
                      {collSaving?'Saving…':'✓ Re-enable'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Reason shown to customers (optional)</label>
                    <input type="text" value={collLabel} onChange={e=>setCollLabel(e.target.value)} placeholder="e.g. Collection unavailable this week" style={{ ...inputStyle, marginBottom:'14px' }} />
                    <button onClick={disableCollection} disabled={collSaving||!collOverrideLoaded} style={{ background:collSaving?'rgba(220,38,38,0.4)':'#dc2626', color:'#fff', border:'none', borderRadius:'10px', padding:'11px 22px', fontSize:'13px', fontWeight:600, fontFamily:'inherit', cursor:collSaving||!collOverrideLoaded?'not-allowed':'pointer' }}>
                      {collSaving?'Saving…':'🚫 Disable Collection This Week'}
                    </button>
                  </div>
                )}
              </div>

              {/* Add new holiday */}
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'16px', padding:'24px', marginBottom:'20px' }}>
                <h2 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'16px', fontWeight:600, marginBottom:'18px' }}>Add a closure period</h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div>
                    <label style={labelStyle}>Closure starts</label>
                    <input type="date" value={newFrom} min={today} onChange={e=>setNewFrom(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Closure ends</label>
                    <input type="date" value={newTo} min={newFrom||today} onChange={e=>setNewTo(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom:'16px' }}>
                  <label style={labelStyle}>Label (optional)</label>
                  <input type="text" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="e.g. Summer holiday, Christmas break…" style={inputStyle} />
                </div>
                {addError && <p style={{ color:'#ef4444', fontSize:'13px', marginBottom:'12px' }}>{addError}</p>}
                {newFrom && newTo && new Date(newTo)>=new Date(newFrom) && (
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'11px 14px', marginBottom:'16px', fontSize:'13px', color:'#1e40af' }}>
                    Closed from <strong>{formatDate(newFrom)}</strong> to <strong>{formatDate(newTo)}</strong> (inclusive).
                  </div>
                )}
                <button onClick={addHoliday} disabled={saving==='add'} style={{ background:saving==='add'?'rgba(37,99,235,0.5)':MS_BLUE, color:'#fff', border:'none', borderRadius:'10px', padding:'11px 22px', fontSize:'13px', fontWeight:600, fontFamily:'inherit', cursor:saving==='add'?'not-allowed':'pointer' }}>
                  {saving==='add'?'Saving…':'+ Add closure period'}
                </button>
              </div>

              {/* Holidays list */}
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'16px', overflow:'hidden', marginBottom:'20px' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h2 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'16px', fontWeight:600 }}>Scheduled closures</h2>
                  <span style={{ background:'#f3f4f6', borderRadius:'20px', padding:'3px 10px', fontSize:'12px', color:'#6b7280', fontWeight:500 }}>{holidays.length} {holidays.length===1?'period':'periods'}</span>
                </div>
                {loading ? (
                  <div style={{ padding:'32px', textAlign:'center', color:'#9ca3af' }}>Loading…</div>
                ) : sortedHolidays.length===0 ? (
                  <div style={{ padding:'40px', textAlign:'center' }}>
                    <div style={{ fontSize:'32px', marginBottom:'10px' }}>🌴</div>
                    <p style={{ color:'#6b7280', fontSize:'14px' }}>No closures scheduled yet.</p>
                  </div>
                ) : (
                  <div>
                    {sortedHolidays.map((h,i) => {
                      const active=isActive(h), upcoming=isUpcoming(h), past=!active&&!upcoming;
                      return (
                        <div key={h.id} style={{ padding:'14px 20px', borderBottom:i<sortedHolidays.length-1?'1px solid rgba(0,0,0,0.05)':'none', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', opacity:past?0.5:1, flexWrap:'wrap' }}>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px', flexWrap:'wrap' }}>
                              <span style={{ fontWeight:600, fontSize:'14px' }}>{h.label}</span>
                              {active && <span style={{ background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca', padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:600, textTransform:'uppercase' }}>Active</span>}
                              {upcoming && <span style={{ background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:600, textTransform:'uppercase' }}>Upcoming</span>}
                              {past && <span style={{ background:'#f9fafb', color:'#9ca3af', border:'1px solid #e5e7eb', padding:'2px 8px', borderRadius:'20px', fontSize:'10px' }}>Past</span>}
                            </div>
                            <p style={{ fontSize:'12px', color:'#6b7280' }}>{formatDate(h.from)} → {formatDate(h.to)}</p>
                          </div>
                          <button onClick={()=>removeHoliday(h.id)} disabled={saving===h.id} style={{ background:'transparent', border:'1px solid #fecaca', color:saving===h.id?'#fca5a5':'#dc2626', padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:500, fontFamily:'inherit', cursor:saving===h.id?'not-allowed':'pointer', flexShrink:0 }}>
                            {saving===h.id?'Removing…':'Remove'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* How it works */}
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'16px', padding:'20px 24px' }}>
                <h3 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'14px', fontWeight:600, marginBottom:'12px', color:'#374151' }}>How it works</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    ['🛍️','Use "Disable Collection" above to block collection for the week — delivery still works.'],
                    ['🔒','During a full closure period, the website locks all ordering automatically.'],
                    ['📅','The existing Mon–Thu weekly lock still applies on top of any closures.'],
                    ['✅','Everything re-enables automatically or the moment you click re-enable.'],
                    ['🗑️',"You can remove or change anything at any time, even while it's active."],
                  ].map(([icon,text],i)=>(
                    <div key={i} style={{ display:'flex', gap:'10px', fontSize:'13px', color:'#4b5563' }}>
                      <span style={{ fontSize:'15px', flexShrink:0 }}>{icon}</span>
                      <span style={{ lineHeight:1.6 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── MENU TAB ────────────────────────────────────────────────── */}
          {activeTab === 'menu' && (
            <>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
                <div>
                  <h2 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'20px', fontWeight:700, marginBottom:'2px' }}>Menu Items</h2>
                  <p style={{ color:'#6b7280', fontSize:'13px' }}>All items are pulled from and saved to Google Sheets.</p>
                </div>
                <button
                  onClick={() => { setShowAddForm(true); setEditingItem(null); }}
                  style={{ background:MS_BLUE, color:'#fff', border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
                >
                  + Add Item
                </button>
              </div>

              {/* Add item form */}
              {showAddForm && (
                <div style={{ background:'#fff', border:`2px solid ${MS_BLUE}`, borderRadius:'16px', padding:'24px', marginBottom:'20px' }}>
                  <h3 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'16px', fontWeight:600, marginBottom:'18px' }}>New Menu Item</h3>
                  <MenuItemForm
                    item={newItem}
                    onChange={setNewItem}
                    onSave={addMenuItem}
                    onCancel={() => { setShowAddForm(false); setNewItem(EMPTY_ITEM); }}
                    saving={menuSaving === 'add'}
                    saveLabel="Add to Menu"
                  />
                </div>
              )}

              {/* Category filter */}
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px' }}>
                {['All', ...VALID_CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMenuFilter(cat)}
                    style={{ background:menuFilter===cat?MS_BLUE:'#fff', color:menuFilter===cat?'#fff':'#374151', border:`1px solid ${menuFilter===cat?MS_BLUE:'rgba(0,0,0,0.12)'}`, borderRadius:'100px', padding:'6px 14px', fontSize:'12px', fontWeight:menuFilter===cat?600:400, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
                  >
                    {cat}
                  </button>
                ))}
                <button onClick={loadMenu} style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.12)', color:'#6b7280', borderRadius:'100px', padding:'6px 14px', fontSize:'12px', fontFamily:'inherit', cursor:'pointer', flexShrink:0, marginLeft:'auto' }}>
                  ↻ Refresh
                </button>
              </div>

              {/* Menu items list */}
              {menuLoading ? (
                <div style={{ padding:'40px', textAlign:'center', color:'#9ca3af', background:'#fff', borderRadius:'16px' }}>Loading menu…</div>
              ) : filteredMenu.length === 0 ? (
                <div style={{ padding:'48px', textAlign:'center', background:'#fff', borderRadius:'16px' }}>
                  <div style={{ fontSize:'32px', marginBottom:'10px' }}>🍽️</div>
                  <p style={{ color:'#6b7280', fontSize:'14px' }}>No items found.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {filteredMenu.map(item => (
                    <div key={item.rowNumber}>
                      {editingItem?.rowNumber === item.rowNumber ? (
                        <div style={{ background:'#fff', border:`2px solid ${MS_BLUE}`, borderRadius:'16px', padding:'20px' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                            <h3 style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:'15px', fontWeight:600 }}>Edit Item</h3>
                            <button onClick={()=>setEditingItem(null)} style={{ background:'transparent', border:'none', color:'#9ca3af', fontSize:'20px', cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
                          </div>
                          <MenuItemForm
                            item={editingItem}
                            onChange={setEditingItem}
                            onSave={saveEditItem}
                            onCancel={() => setEditingItem(null)}
                            saving={menuSaving === item.rowNumber}
                            saveLabel="Save Changes"
                          />
                        </div>
                      ) : (
                        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'14px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', opacity:menuSaving===item.rowNumber?0.6:1 }}>
                          {/* Availability dot */}
                          <button
                            onClick={()=>toggleAvailable(item)}
                            disabled={!!menuSaving}
                            title={item.available?'Mark unavailable':'Mark available'}
                            style={{ width:'12px', height:'12px', borderRadius:'50%', background:item.available?'#22c55e':'#d1d5db', border:'none', cursor:menuSaving?'not-allowed':'pointer', flexShrink:0, padding:0 }}
                          />
                          {/* Image thumbnail */}
                          {item.image && (
                            <img src={item.image} alt={item.name} onError={e=>e.target.style.display='none'} style={{ width:'44px', height:'44px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} />
                          )}
                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                              <span style={{ fontWeight:600, fontSize:'14px', color:'#111' }}>{item.name}</span>
                              <span style={{ background:'#f3f4f6', color:'#6b7280', fontSize:'11px', padding:'2px 8px', borderRadius:'10px' }}>{item.category}</span>
                              <span style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>£{Number(item.price).toFixed(2)}</span>
                              {!item.available && <span style={{ background:'#fef2f2', color:'#b91c1c', fontSize:'11px', padding:'2px 8px', borderRadius:'10px', border:'1px solid #fecaca' }}>Unavailable</span>}
                            </div>
                            {item.description && (
                              <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description}</p>
                            )}
                          </div>
                          {/* Actions */}
                          <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                            <button
                              onClick={()=>setEditingItem({...item})}
                              disabled={!!menuSaving}
                              style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.12)', color:'#374151', padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:500, fontFamily:'inherit', cursor:menuSaving?'not-allowed':'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={()=>deleteMenuItem(item)}
                              disabled={!!menuSaving}
                              style={{ background:'transparent', border:'1px solid #fecaca', color:'#dc2626', padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:500, fontFamily:'inherit', cursor:menuSaving?'not-allowed':'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div style={{ marginTop:'16px', display:'flex', alignItems:'center', gap:'16px', fontSize:'12px', color:'#9ca3af', padding:'0 4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#22c55e' }} />
                  Available — click to toggle
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#d1d5db' }} />
                  Unavailable
                </div>
              </div>
            </>
          )}

        </main>

        <footer style={{ background:MS_DARK, padding:'18px 20px', textAlign:'center' }}>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'12px' }}>
            Built &amp; maintained by{' '}
            <a href="https://munrostudio.co.uk" target="_blank" rel="noreferrer" style={{ color:MS_BLUE, textDecoration:'none' }}>Munro Studio</a>
            {' '}· Glasgow Web Design · £55/month
          </p>
        </footer>

        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
          input[type="date"]::-webkit-calendar-picker-indicator { cursor:pointer; opacity:0.6; }
          @media (max-width: 500px) {
            .menu-item-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}

// ── Reusable item form (add & edit) ───────────────────────────────────────────
function MenuItemForm({ item, onChange, onSave, onCancel, saving, saveLabel }) {
  const set = (field, val) => onChange(prev => ({ ...prev, [field]: val }));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'12px' }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select value={item.category} onChange={e=>set('category', e.target.value)} style={inputStyle}>
            {VALID_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Name *</label>
          <input type="text" value={item.name} onChange={e=>set('name', e.target.value)} placeholder="e.g. Grilled Salmon Bowl" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Price (£) *</label>
          <input type="number" step="0.01" min="0" value={item.price} onChange={e=>set('price', e.target.value)} placeholder="9.50" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={labelStyle}>Description</label>
        <input type="text" value={item.description} onChange={e=>set('description', e.target.value)} placeholder="Short description…" style={inputStyle} />
      </div>
      <div style={{ marginBottom:'16px' }}>
        <label style={labelStyle}>Image URL</label>
        <input type="text" value={item.image} onChange={e=>set('image', e.target.value)} placeholder="https://…" style={inputStyle} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
        <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px', color:'#374151' }}>
          <input
            type="checkbox"
            checked={!!item.available}
            onChange={e=>set('available', e.target.checked)}
            style={{ width:'16px', height:'16px', cursor:'pointer' }}
          />
          Available on menu
        </label>
      </div>
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <button onClick={onSave} disabled={saving} style={{ background:saving?'rgba(37,99,235,0.5)':MS_BLUE, color:'#fff', border:'none', borderRadius:'10px', padding:'11px 22px', fontSize:'13px', fontWeight:600, fontFamily:"'DM Sans', sans-serif", cursor:saving?'not-allowed':'pointer' }}>
          {saving?'Saving…':saveLabel}
        </button>
        <button onClick={onCancel} disabled={saving} style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.12)', color:'#374151', borderRadius:'10px', padding:'11px 22px', fontSize:'13px', fontWeight:500, fontFamily:"'DM Sans', sans-serif", cursor:'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display:'block', fontSize:'11px', fontWeight:600, color:'#6b7280',
  textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px',
};

const inputStyle = {
  width:'100%', background:'#f9fafb', border:'1px solid rgba(0,0,0,0.1)',
  borderRadius:'10px', padding:'10px 13px', fontSize:'14px',
  fontFamily:"'DM Sans', sans-serif", color:'#1a1a1a', outline:'none',
  boxSizing:'border-box',
};
