import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Blog.module.css';
import { blogPosts } from '../../data/blogPosts';
import { SITE_URL, SITE_NAME } from '../../lib/site';

export default function BlogIndex() {
  const pageUrl = `${SITE_URL}/blog`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE_NAME} Blog`,
    url: pageUrl,
    blogPost: blogPosts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.date,
    })),
  };

  return (
    <>
      <Head>
        <title>Blog: Nutrition & Gut Health in Glasgow | Root &amp; Fuel</title>
        <meta
          name="description"
          content="Whole-food nutrition, gut health and meal prep tips from Root & Fuel, Glasgow, plus the story behind why we started."
        />
        <link rel="canonical" href={pageUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${SITE_NAME} Blog`} />
        <meta property="og:description" content="Whole-food nutrition, gut health and meal prep tips from Root & Fuel, Glasgow." />
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
              <Link href="/#about" className={styles.navLink}>About</Link>
              <Link href="/blog" className={`${styles.navLink} ${styles.navLinkActive}`}>Blog</Link>
            </nav>
          </div>
        </header>

        <div className={styles.intro}>
          <span className={styles.label}>The Journal</span>
          <h1 className={styles.title}>Nutrition, gut health &amp; life in Glasgow</h1>
          <p className={styles.lead}>
            Notes on whole food, performance nutrition and the story behind Root &amp; Fuel, written by our founder, Samantha.
          </p>
        </div>

        <div className={styles.grid}>
          {blogPosts
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
                <img src={post.image} alt={post.title} className={styles.cardImg} />
                <div className={styles.cardBody}>
                  <div className={styles.cardTags}>
                    {post.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                  </div>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.cardDesc}>{post.description}</p>
                  <p className={styles.cardMeta}>
                    {new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {post.readTime}
                  </p>
                </div>
              </Link>
            ))}
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerText}>© {new Date().getFullYear()} Root + Fuel · Glasgow</p>
        </footer>
      </div>
    </>
  );
}
