import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/CookieConsent.module.css';

const STORAGE_KEY = 'rf-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private mode, blocked); skip the banner rather than error
    }
  }, []);

  const dismiss = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie notice">
      <p className={styles.text}>
        We use privacy-friendly, cookie-free analytics to understand site traffic. No tracking cookies are set.
        See our <Link href="/privacy-policy" className={styles.link}>Privacy Policy</Link> for details.
      </p>
      <div className={styles.actions}>
        <button className={styles.accept} onClick={() => dismiss('accepted')}>Got it</button>
      </div>
    </div>
  );
}
