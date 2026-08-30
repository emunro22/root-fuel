import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Blog.module.css';
import { SITE_URL, SITE_NAME, PHONE, PHONE_DISPLAY } from '../lib/site';

export default function About() {
  const pageUrl = `${SITE_URL}/about`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: { '@id': `${SITE_URL}/#business` },
  };

  return (
    <>
      <Head>
        <title>About Us — Root &amp; Fuel Performance Nutrition, Glasgow</title>
        <meta
          name="description"
          content="Root & Fuel is a family-run performance nutrition and health food business in Glasgow, founded by Samantha Hamilton. Read our story."
        />
        <link rel="canonical" href={pageUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`About ${SITE_NAME}`} />
        <meta property="og:description" content="Family-run performance nutrition and health food business in Glasgow." />
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
              <Link href="/#menu" className={styles.navLink}>Menu</Link>
              <Link href="/about" className={`${styles.navLink} ${styles.navLinkActive}`}>About</Link>
              <Link href="/blog" className={styles.navLink}>Blog</Link>
              <Link href="/contact" className={styles.navLink}>Contact</Link>
            </nav>
          </div>
        </header>

        <article className={styles.article}>
          <span className={styles.label}>Our Story</span>
          <h1 className={styles.articleTitle}>
            Performance nutrition, rooted in nature
          </h1>
          <div className={styles.articleBody}>
            <p>
              Root &amp; Fuel is a small, family-run performance nutrition and health food business based in Glasgow.
              We make whole-food meal prep and catering that&apos;s built for people who demand more from what they eat —
              busy parents, corporate professionals, and anyone fuelling an active lifestyle.
            </p>

            <h2>Founded by Samantha Hamilton</h2>
            <p>
              I&apos;m Samantha, a mum of two with a lifelong love of cooking — but it wasn&apos;t until 2020 that food became
              something much deeper than just flavour. After being diagnosed with ADHD and struggling with ongoing gut
              issues including IBS, endometriosis, chronic bloating and persistent stomach pain, I was forced to take a
              hard look at what I was putting into my body.
            </p>
            <p>
              What I found was simple, but powerful: the more I relied on overly processed foods, the worse I felt —
              physically, mentally and hormonally. So I started to change things. When I had my first baby in 2021, I began
              focusing on whole, nourishing foods for my family, tracking how different ingredients made me feel, and
              slowly building a way of eating that supported not just my body, but my brain too.
            </p>
            <p>
              In 2025 I stepped away from the corporate world to build something of my own — something that genuinely
              mattered. Root &amp; Fuel is the result of that journey.
            </p>

            <h2>What we do</h2>
            <p>
              We cook whole-food meal prep — mains, starters, desserts, overnight oats, poke bowls and grab-and-go options —
              delivered fresh across Glasgow every Tuesday. We also provide bespoke whole-food catering for corporate
              events, sports teams and private functions.
            </p>

            <h2>Our mission</h2>
            <p>
              To make real, fresh, nourishing food more accessible for busy people, without compromising on quality,
              flavour or nutrition. Nothing we do is overly complicated or pretentious — it&apos;s simply good food, made
              with intention and purpose.
            </p>

            <h2>Get in touch</h2>
            <p>
              Have a question, want to talk catering, or just want to say hello? Call us on{' '}
              <a href={`tel:${PHONE}`} style={{ color: '#2d6b27', fontWeight: 600 }}>{PHONE_DISPLAY}</a>{' '}
              or use our <Link href="/contact" style={{ color: '#2d6b27', fontWeight: 600 }}>contact form</Link>.
            </p>
          </div>

          <div className={styles.articleCta}>
            <p className={styles.articleCtaText}>Ready to fuel your week?</p>
            <Link href="/#menu" className={styles.ctaBtn}>View the menu</Link>
          </div>
        </article>

        <footer className={styles.footer}>
          <p className={styles.footerText}>© {new Date().getFullYear()} Root + Fuel · Glasgow</p>
        </footer>
      </div>
    </>
  );
}
