import { useState } from 'react';
import styles from '../styles/CateringModal.module.css';

export default function CateringModal({ onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', eventDate: '', guestCount: '', message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/catering-enquiry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <button className={styles.close} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className={styles.header}>
          <span className={styles.headerIcon}>🍽️</span>
          <h2 className={styles.title}>Catering Enquiry</h2>
          <p className={styles.subtitle}>
            Fuelling your event with performance nutrition. Tell us about your needs and we'll be in touch.
          </p>
        </div>

        {status === 'success' ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h3>Enquiry sent!</h3>
            <p>Thanks — we'll be in touch shortly to discuss your event.</p>
            <button className={styles.doneBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Your name *</label>
                <input
                  className={styles.input}
                  type="text" required placeholder="Jane Smith"
                  value={form.name} onChange={set('name')}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email *</label>
                <input
                  className={styles.input}
                  type="email" required placeholder="jane@example.com"
                  value={form.email} onChange={set('email')}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Phone</label>
                <input
                  className={styles.input}
                  type="tel" placeholder="+44 7700 000000"
                  value={form.phone} onChange={set('phone')}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Event date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.eventDate} onChange={set('eventDate')}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Approximate guest count</label>
              <input
                className={styles.input}
                type="number" min="1" placeholder="e.g. 50"
                value={form.guestCount} onChange={set('guestCount')}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tell us about your event *</label>
              <textarea
                className={styles.textarea}
                required rows={4}
                placeholder="Event type, dietary requirements, location, any other details..."
                value={form.message} onChange={set('message')}
              />
            </div>

            {status === 'error' && (
              <p className={styles.errorMsg}>Something went wrong — please try again.</p>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending…' : 'Send Enquiry'}
              {status !== 'loading' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}