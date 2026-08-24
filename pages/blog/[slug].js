import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Blog.module.css';
import { blogPosts, getPostBySlug } from '../../data/blogPosts';
import { SITE_URL, SITE_NAME, ADDRESS } from '../../lib/site';

export async function getStaticPaths() {
  return {
    paths: blogPosts.map(p => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { notFound: true };
  return { props: { post } };
}

export default function BlogPost({ post }) {
  const pageUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = `${SITE_URL}${post.image}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.date,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    author: {
      '@type': 'Person',
      name: 'Samantha Hamilton',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  return (
    <>
      <Head>
        <title>{post.title} | Root &amp; Fuel</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={pageUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta property="article:published_time" content={post.date} />
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

        <article className={styles.article}>
          <Link href="/blog" className={styles.backLink}>← Back to the journal</Link>

          <div className={styles.articleTags}>
            {post.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <p className={styles.articleMeta}>
            By Samantha Hamilton · {new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {post.readTime}
          </p>

          <img src={post.image} alt={post.title} className={styles.articleImg} />

          <div className={styles.articleBody}>
            {post.content.map((block, i) =>
              block.type === 'h2'
                ? <h2 key={i}>{block.text}</h2>
                : <p key={i}>{block.text}</p>
            )}
          </div>

          <div className={styles.articleCta}>
            <p className={styles.articleCtaText}>Ready to fuel your week with whole food, delivered in {ADDRESS.addressLocality}?</p>
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
