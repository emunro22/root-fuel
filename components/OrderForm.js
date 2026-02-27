import { useState } from 'react';
import styles from './OrderForm.module.css';

const ORDER_TYPES = [
  { id: 'pickup',   label: 'Collection', icon: '🛍️' },
  { id: 'delivery', label: 'Delivery',   icon: '🚴' },
];

export default function OrderForm({ cart, onClose }) {
  const [orderType, setOrderType] = useState('pickup');
  const [form,      setForm]      = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim())                               return 'Please enter your name';
    if (!form.email.trim() || !form.email.includes('@')) return 'Please enter a valid email';
    if (orderType === 'delivery' && !form.address.trim()) return 'Please enter your delivery address';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: { name: form.name, email: form.email, phone: form.phone },
          orderType,
          table: '',
          address: form.address,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <h2 className={styles.title}>Complete Your Order</h2>
            <button className={styles.close} onClick={onClose}>✕</button>
          </div>
          <div className={styles.body}>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>How would you like your order?</span>
              <div className={styles.typeGrid}>
                {ORDER_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.typeBtn} ${orderType === t.id ? styles.typeActive : ''}`}
                    onClick={() => setOrderType(t.id)}
                  >
                    <span className={styles.typeIcon}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your Details</span>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name *</label>
                    <input className={styles.input} type="text" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email *</label>
                    <input className={styles.input} type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone</label>
                    <input className={styles.input} type="tel" placeholder="Optional" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  {orderType === 'delivery' && (
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                      <label className={styles.label}>Delivery Address *</label>
                      <textarea className={`${styles.input} ${styles.textarea}`} placeholder="Full delivery address" value={form.address} onChange={e => set('address', e.target.value)} rows={3} />
                    </div>
                  )}
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Allergies / Notes</label>
                    <textarea className={`${styles.input} ${styles.textarea}`} placeholder="Allergies, dietary requirements, special requests..." value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionLabel}>Order Summary</span>
                <div className={styles.summary}>
                  {cart.map(item => (
                    <div key={item.name} className={styles.summaryRow}>
                      <span>{item.quantity}× {item.name}</span>
                      <span>£{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className={styles.summaryTotal}>
                    <span className={styles.summaryTotalLabel}>Total</span>
                    <span className={styles.summaryTotalAmt}>£{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <><span className={styles.spinner} /> Redirecting to payment…</>
                ) : (
                  <>Pay £{total.toFixed(2)} with Stripe
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
              <p className={styles.secure}>🔒 Secure payment powered by Stripe</p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}