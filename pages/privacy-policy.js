import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Blog.module.css';
import { SITE_URL, SITE_NAME, LEGAL_NAME, COMPANY_NUMBER, REGISTERED_ADDRESS, CONTACT_EMAIL } from '../lib/site';

export default function PrivacyPolicy() {
  const pageUrl = `${SITE_URL}/privacy-policy`;

  return (
    <>
      <Head>
        <title>Privacy Policy — Root &amp; Fuel</title>
        <meta name="description" content="How Root & Fuel Ltd collects, uses and protects your personal data when you order, enquire about catering, or browse our website." />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="noindex, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
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
              <Link href="/contact" className={styles.navLink}>Contact</Link>
            </nav>
          </div>
        </header>

        <article className={styles.article}>
          <span className={styles.label}>Legal</span>
          <h1 className={styles.articleTitle}>Privacy Policy</h1>
          <p className={styles.articleMeta}>Last updated 30 August 2026</p>

          <div className={styles.articleBody}>
            <p>
              {LEGAL_NAME} (company number {COMPANY_NUMBER}), registered office {REGISTERED_ADDRESS}, trading as
              &quot;Root &amp; Fuel&quot; (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), is the data controller for
              personal data collected through {SITE_URL}. We are committed to protecting your privacy in line with the
              UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h2>What we collect</h2>
            <p>When you order, enquire about catering, or contact us, we may collect:</p>
            <ul>
              <li>Name, email address, phone number and delivery/postal address</li>
              <li>Order details — items, delivery date, promo codes used</li>
              <li>Catering enquiry details — event date, guest count, dietary requirements</li>
              <li>Payment information, processed directly by our payment provider, Stripe (we do not store card details ourselves)</li>
              <li>Messages you send us through our contact or enquiry forms</li>
            </ul>

            <h2>How we use your data</h2>
            <ul>
              <li>To fulfil and deliver your order</li>
              <li>To respond to catering enquiries and contact-form messages</li>
              <li>To send order confirmations, delivery updates and — where you&apos;ve ordered from us — an occasional review request</li>
              <li>To prevent abuse of promotional discount codes</li>
              <li>To meet our legal and accounting obligations</li>
            </ul>

            <h2>Who we share it with</h2>
            <p>We use the following third-party processors to run our service. Each only receives the data it needs to do its job:</p>
            <ul>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Resend</strong> — transactional email delivery (order confirmations, enquiry notifications)</li>
              <li><strong>Vercel</strong> — website hosting, order storage and privacy-friendly, cookieless analytics</li>
              <li><strong>OpenStreetMap (Nominatim)</strong> — checking delivery addresses fall within our delivery area</li>
              <li><strong>Google Sheets</strong> — internal logging of catering enquiries</li>
            </ul>
            <p>We do not sell your personal data.</p>

            <h2>Cookies</h2>
            <p>
              Our website analytics (Vercel Web Analytics) is cookieless — it does not set tracking cookies or use
              persistent identifiers. Where we ever introduce cookies that aren&apos;t strictly necessary for the site to
              function, we will ask for your consent first via the cookie banner.
            </p>

            <h2>How long we keep your data</h2>
            <p>
              We keep order records for as long as necessary to meet our accounting and tax obligations (normally 6
              years), and contact-form/catering enquiries for as long as needed to respond to and resolve them.
            </p>

            <h2>Your rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Ask us to correct inaccurate data</li>
              <li>Ask us to delete your data, where we&apos;re not required to keep it</li>
              <li>Object to or restrict certain processing</li>
              <li>Complain to the UK Information Commissioner&apos;s Office (ICO) at ico.org.uk</li>
            </ul>

            <h2>Contact us</h2>
            <p>
              For any privacy question or to exercise your rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#2d6b27', fontWeight: 600 }}>{CONTACT_EMAIL}</a>{' '}
              or use our <Link href="/contact" style={{ color: '#2d6b27', fontWeight: 600 }}>contact form</Link>.
            </p>
          </div>
        </article>

        <footer className={styles.footer}>
          <p className={styles.footerText}>© {new Date().getFullYear()} Root + Fuel · Glasgow</p>
        </footer>
      </div>
    </>
  );
}
