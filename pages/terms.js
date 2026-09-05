import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Blog.module.css';
import { SITE_URL, LEGAL_NAME, COMPANY_NUMBER, REGISTERED_ADDRESS, CONTACT_EMAIL, PHONE_DISPLAY } from '../lib/site';

export default function Terms() {
  const pageUrl = `${SITE_URL}/terms`;

  return (
    <>
      <Head>
        <title>Terms &amp; Conditions: Root &amp; Fuel</title>
        <meta name="description" content="The terms and conditions that apply when you order food or catering from Root & Fuel Ltd, Glasgow." />
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
          <h1 className={styles.articleTitle}>Terms &amp; Conditions</h1>
          <p className={styles.articleMeta}>Last updated 30 August 2026</p>

          <div className={styles.articleBody}>
            <p>
              These terms apply whenever you order food, meal prep or catering from {LEGAL_NAME} (company number{' '}
              {COMPANY_NUMBER}), registered office {REGISTERED_ADDRESS}, trading as &quot;Root &amp; Fuel&quot;, through{' '}
              {SITE_URL}. By placing an order you agree to these terms.
            </p>

            <h2>Ordering &amp; delivery</h2>
            <ul>
              <li>Tuesday delivery orders open on Wednesday and close at midnight on Friday.</li>
              <li>Orders are delivered between 8am and 12pm on the delivery date, to addresses within our delivery area.</li>
              <li>We may pause or close ordering around public holidays. Any closure is shown on the site in advance.</li>
              <li>It&apos;s your responsibility to provide an accurate delivery address and to be available to receive your order.</li>
            </ul>

            <h2>Payment</h2>
            <p>
              Payment is taken online at checkout via Stripe. All prices are shown in GBP and include any applicable VAT.
              We reserve the right to correct pricing errors before an order is confirmed.
            </p>

            <h2>Promo codes</h2>
            <p>
              Discount codes are limited to one use per customer/email address and may be withdrawn or changed at any
              time without notice.
            </p>

            <h2>Cancellations &amp; refunds</h2>
            <p>
              Contact us as soon as possible if you need to cancel or amend an order; we&apos;ll do our best to
              accommodate changes made before the Friday ordering cutoff. Once an order has entered preparation it
              cannot be cancelled. If we&apos;re unable to fulfil an order for any reason, we&apos;ll offer a full refund.
            </p>

            <h2>Allergies &amp; dietary information</h2>
            <p>
              Our food is prepared in a kitchen that handles common allergens. If you have an allergy or intolerance,
              please tell us before ordering. You can do so via our contact form or by phone. While we take care to
              accommodate dietary requirements, we cannot guarantee any dish is entirely free from trace allergens.
            </p>

            <h2>Catering enquiries</h2>
            <p>
              A catering enquiry is not a confirmed booking. We&apos;ll confirm availability, final pricing and event
              details with you directly before any catering booking is treated as confirmed.
            </p>

            <h2>Liability</h2>
            <p>
              Nothing in these terms limits or excludes our liability for death or personal injury caused by our
              negligence, or for fraud. Otherwise, our liability for any order is limited to the value of that order.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms? Call us on {PHONE_DISPLAY}, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#2d6b27', fontWeight: 600 }}>{CONTACT_EMAIL}</a>, or use
              our <Link href="/contact" style={{ color: '#2d6b27', fontWeight: 600 }}>contact form</Link>.
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
