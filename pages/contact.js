import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Blog.module.css';
import formStyles from '../styles/CateringModal.module.css';
import { SITE_URL, SITE_NAME, PHONE, PHONE_DISPLAY, CONTACT_EMAIL, ADDRESS_FULL } from '../lib/site';

export default function Contact() {
  const pageUrl = `${SITE_URL}/contact`;
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${SITE_NAME}`,
    url: pageUrl,
  };

  return (
    <>
      <Head>
        <title>Contact Us — Root &amp; Fuel, Glasgow</title>
        <meta name="description" content="Get in touch with Root & Fuel — call, email or send us a message about orders, catering or anything else." />
        <link rel="canonical" href={pageUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Contact ${SITE_NAME}`} />
        <meta property="og:url" content={pageUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              <img src="/logo.png" alt="Root + Fuel" className={styles.logoImg} />
            </Link>
            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>Home</Link>
              <Link href="/about" className={styles.navLink}>About</Link>
              <Link href="/contact" className={`${styles.navLink} ${styles.navLinkActive}`}>Contact</Link>
            </nav>
          </div>
        </header>

        <div className={styles.intro}>
          <span className={styles.label}>Get In Touch</span>
          <h1 className={styles.title}>We&apos;d love to hear from you</h1>
          <p className={styles.lead}>
            Questions about an order, catering, or anything else — call, email, or send us a message below.
          </p>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '8px 28px 110px', display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '14.5px', color: '#3d5239' }}>
            <a href={`tel:${PHONE}`} style={{ color: '#2d6b27', fontWeight: 600 }}>{PHONE_DISPLAY}</a>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#2d6b27', fontWeight: 600 }}>{CONTACT_EMAIL}</a>
            <span>{ADDRESS_FULL}</span>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)' }}>
            {status === 'success' ? (
              <div className={formStyles.success}>
                <div className={formStyles.successIcon}>✅</div>
                <h3>Message sent!</h3>
                <p>Thanks for getting in touch — we&apos;ll reply as soon as we can.</p>
              </div>
            ) : (
              <form className={formStyles.form} onSubmit={handleSubmit}>
                <div className={formStyles.row}>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="contact-name">Your name *</label>
                    <input
                      id="contact-name" name="name" className={formStyles.input}
                      type="text" required autoComplete="name" placeholder="Jane Smith"
                      value={form.name} onChange={set('name')}
                    />
                  </div>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="contact-email">Email *</label>
                    <input
                      id="contact-email" name="email" className={formStyles.input}
                      type="email" required autoComplete="email" placeholder="jane@example.com"
                      value={form.email} onChange={set('email')}
                    />
                  </div>
                </div>

                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="contact-phone">Phone</label>
                  <input
                    id="contact-phone" name="phone" className={formStyles.input}
                    type="tel" autoComplete="tel" placeholder="+44 7700 000000"
                    value={form.phone} onChange={set('phone')}
                  />
                </div>

                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="contact-message">Message *</label>
                  <textarea
                    id="contact-message" name="message" className={formStyles.textarea}
                    required rows={5} placeholder="How can we help?"
                    value={form.message} onChange={set('message')}
                  />
                </div>

                {status === 'error' && (
                  <p className={formStyles.errorMsg}>Something went wrong — please try again or call us.</p>
                )}

                <button type="submit" className={formStyles.submitBtn} disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerText}>© {new Date().getFullYear()} Root + Fuel · Glasgow</p>
        </footer>
      </div>
    </>
  );
}
