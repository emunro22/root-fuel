import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Cart from '../components/Cart';
import MenuItem from '../components/MenuItem';
import OrderForm from '../components/OrderForm';
import CateringModal from '../components/CateringModal';
import InstagramEmbed from '../components/InstagramEmbed';
import { SITE_URL, SITE_NAME, ADDRESS, INSTAGRAM_URL, GOOGLE_REVIEW_URL, FEATURED_INSTAGRAM_POSTS, PHONE, PHONE_DISPLAY } from '../lib/site';

const CATEGORIES = [
  { name: 'Starters',       icon: '' },
  { name: 'Mains',          icon: '' },
  { name: 'Desserts',       icon: '' },
  { name: 'Overnight Oats', icon: '' },
  { name: 'Poke Bowls',     icon: '' },
  { name: 'Grab & Go',      icon: '' },
  { name: 'Specials',      icon: '' },
];

const CREAM = '#f5f1ea';
const WHITE = '#ffffff';
const GREEN = '#2d6b27';

// Local shops and gyms that stock Root + Fuel — drop matching logo files into
// /public/stockists/ (see the `logo` path below); until a file exists, the
// initials badge is shown instead so nothing ever renders as a broken image.
// `fit: 'contain'` is for wide wordmark logos (would get cropped by a circular
// cover-fit), `fit: 'cover'` is for square/round badge logos that should fill
// the circle edge-to-edge.
const STOCKISTS = [
  { name: 'Spar Kilbowie Rd',         address: '493 Kilbowie Road, Clydebank, G81 2AX',          logo: '/stockists/spar.png',                        fit: 'contain' },
  { name: 'Top of the Hill Butchers', address: '383 Kilbowie Road, Clydebank, G81 2TU',          logo: '/stockists/top-of-the-hill-butchers.jpg',    fit: 'cover' },
  { name: 'Keystore',                 address: '104-108 Baldwin Avenue, Knightswood, G13 2QU',  logo: '/stockists/keystore.jpg',                    fit: 'cover' },
  { name: 'Nisa Local',               address: '232 Dumbarton Road, Old Kilpatrick, G60 5LJ',   logo: '/stockists/nisa-local.png',                  fit: 'contain' },
  { name: 'Foundry Gym',              address: '2 Ferry Road, Renfrew, PA4 8RU',                 logo: '/stockists/foundry-gym.jpg',                 fit: 'cover' },
  { name: 'Spar Renfrew',             address: '194-198 Paisley Road, Renfrew, PA4 8DS',        logo: '/stockists/spar-renfrew.png',                fit: 'contain' },
];

const FAQS = [
  {
    question: 'What area do you deliver to?',
    answer: 'We deliver our performance nutrition meals across Glasgow, with delivery on Tuesdays between 8am and 12pm. Check the menu page for the full postcode list at checkout.',
  },
  {
    question: 'When do I need to order by?',
    answer: 'Tuesday delivery orders open on Wednesday and close at midnight on Friday. Get your order in before the Friday cutoff to guarantee delivery the following Tuesday.',
  },
  {
    question: "What's in a Root & Fuel meal?",
    answer: 'Whole, locally sourced ingredients — no ultra-processed fillers. Our menu covers mains, starters, desserts, overnight oats, poke bowls and grab-and-go options, all built around performance nutrition.',
  },
  {
    question: 'Do you cater for events?',
    answer: 'Yes — we offer bespoke whole-food catering for corporate events, sports teams and private functions in Glasgow. Get in touch through our catering enquiry form with your event details.',
  },
  {
    question: 'Can you cater for dietary requirements?',
    answer: "Let us know your dietary requirements when you order or enquire — we're happy to talk through options for common allergies and preferences.",
  },
];

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Ordering schedule (single delivery window):
 *   Tuesday delivery: order Wed(3) → Fri(5) midnight
 *
 * Only holiday closures lock the window.
 *
 * Collection slots:
 *   Tuesday: 13:00, 16:00
 */

function computeTimeLeft(diff) {
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function useCountdown() {
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockSource, setLockSource] = useState('');
  const [tuesdayOpen, setTuesdayOpen] = useState(false);
  const [tuesdayTimeLeft, setTuesdayTimeLeft] = useState(null);

  useEffect(() => {
    let intervalId;

    async function fetchStatus() {
      try {
        const res = await fetch('/api/check-lock');
        const data = await res.json();

        setLocked(data.locked);
        setLockReason(data.reason || '');
        setLockSource(data.source || '');
        setTuesdayOpen(data.tuesday?.open || false);

        clearInterval(intervalId);

        if (data.locked) {
          setTuesdayTimeLeft(null);
          return;
        }

        const tueDl = data.tuesday?.deadline ? new Date(data.tuesday.deadline) : null;

        const tick = () => {
          const now = new Date();
          if (tueDl) {
            const diff = tueDl - now;
            if (diff <= 0) { fetchStatus(); return; }
            setTuesdayTimeLeft(computeTimeLeft(diff));
          } else {
            setTuesdayTimeLeft(null);
          }
        };

        tick();
        intervalId = setInterval(tick, 1000);
      } catch {
        const day = new Date().getDay();
        setLocked(false);
        setTuesdayOpen(day >= 3 && day <= 6);
      }
    }

    fetchStatus();
    const pollId = setInterval(fetchStatus, 60000);

    return () => {
      clearInterval(intervalId);
      clearInterval(pollId);
    };
  }, []);

  return { locked, lockReason, lockSource, tuesdayOpen, tuesdayTimeLeft };
}

export default function Home() {
  const [menu,           setMenu]           = useState([]);
  const [cart,           setCart]           = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('rf_cart');
      if (!saved) return [];
      const { items, ts } = JSON.parse(saved);
      if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return [];
      return Array.isArray(items) ? items : [];
    } catch { return []; }
  });
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('Mains');
  const [showCart,       setShowCart]       = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [cartBounce,     setCartBounce]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCatering,   setShowCatering]   = useState(false);
  const [promos,         setPromos]         = useState([]);
  const [copiedCode,     setCopiedCode]     = useState('');
  const [showcaseItems,  setShowcaseItems]  = useState([]);
  const [showcaseTab,    setShowcaseTab]    = useState('current');

const { locked, lockReason, lockSource, tuesdayOpen, tuesdayTimeLeft } = useCountdown();
  const orderingClosed = locked || !tuesdayOpen;

  // ── Hero food image carousel ──────────────────────────────────────────────
  // Add your food photo filenames to /public/food/ and list them here.
  const FOOD_IMAGES = [
    '/food/dish1.jpg',
    '/food/dish2.jpg',
    '/food/dish3.jpg',
    '/food/dish4.jpg',
    '/food/dish5.jpg',
    '/food/dish6.jpg',
    '/food/dish7.jpg',
    '/food/dish8.jpg',
    '/food/dish9.jpg',
    '/food/dish10.jpg',
  ];
  const [carouselIndex, setCarouselIndex] = useState(0);
  useEffect(() => {
    if (FOOD_IMAGES.length < 2) return;
    const id = setInterval(() => {
      setCarouselIndex(i => (i + 1) % FOOD_IMAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('rf_cart', JSON.stringify({ items: cart, ts: Date.now() }));
      } else {
        localStorage.removeItem('rf_cart');
      }
    } catch {}
  }, [cart]);

  // Reopen the order form if the customer is back from a cancelled Stripe payment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled') === 'true') {
      setShowForm(true);
      params.delete('cancelled');
      const newSearch = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }
  }, []);

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => { setMenu(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fade + rise sections into view as the user scrolls to them
  useEffect(() => {
    const revealClasses = [styles.reveal, styles.revealLeft, styles.revealRight].filter(Boolean);
    const selector = revealClasses.map(c => `.${c}`).join(', ');
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.revealVisible);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading, showcaseItems.length]);

  useEffect(() => {
    fetch('/api/promos')
      .then(r => r.json())
      .then(d => setPromos(d.codes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/showcase')
      .then(r => r.json())
      .then(d => setShowcaseItems(d.items || []))
      .catch(() => {});
  }, []);

  const copyPromoCode = (code) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  useEffect(() => {
    document.documentElement.style.background = CREAM;
    document.body.style.background = CREAM;
    document.body.style.color = '#1a2418';
  }, []);

  useEffect(() => {
    document.body.style.overflow = (mobileMenuOpen || showCart || showForm) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, showCart, showForm]);

  const addToCart = useCallback((item) => {
    if (orderingClosed) return;
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing) return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 400);
  }, [orderingClosed]);

  const removeFromCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing?.quantity === 1) return prev.filter(c => c.name !== item.name);
      return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  // Checkout rejected these because they've fallen off the live menu since
  // they were added to a (possibly days-old) cart — drop them so the
  // customer's next attempt only contains items that still exist.
  const removeStaleItems = useCallback((names) => {
    setCart(prev => prev.filter(c => !names.includes(c.name)));
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // Items with no delivery day assigned stay visible every day (keeps legacy
  // items showing until an admin assigns them). Tagged items only show while
  // Tuesday ordering is open.
  const activeMenuDay = tuesdayOpen ? 'tuesday' : null;
  const visibleMenu = menu.filter(i => {
    if (!i.days || i.days.length === 0) return true;
    return activeMenuDay ? i.days.includes(activeMenuDay) : false;
  });
  const categoryItems = visibleMenu.filter(i => i.category === activeCategory);
  const availableCategories = CATEGORIES.filter(cat => visibleMenu.some(i => i.category === cat.name));

  const currentShowcaseItems = showcaseItems.filter(i => i.status === 'current');
  const pastShowcaseItems = showcaseItems.filter(i => i.status === 'past');
  const activeShowcaseItems = showcaseTab === 'current' ? currentShowcaseItems : pastShowcaseItems;

  const scrollToMenu  = () => { document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const scrollToAbout = () => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const scrollToFaq   = () => { document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const switchCategory = (cat) => {
    setActiveCategory(cat);
    setMobileMenuOpen(false);
    setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const pad = n => String(n).padStart(2, '0');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FoodEstablishment',
        '@id': `${SITE_URL}/#business`,
        name: SITE_NAME,
        description: 'Performance nutrition, rooted in nature. Whole-food meal prep and catering, delivered in Glasgow.',
        url: SITE_URL,
        image: `${SITE_URL}/logo.png`,
        logo: `${SITE_URL}/logo.png`,
        telephone: PHONE,
        priceRange: '££',
        servesCuisine: ['Whole Food', 'Meal Prep', 'Healthy'],
        address: {
          '@type': 'PostalAddress',
          streetAddress: ADDRESS.streetAddress,
          addressLocality: ADDRESS.addressLocality,
          postalCode: ADDRESS.postalCode,
          addressCountry: ADDRESS.addressCountry,
        },
        areaServed: {
          '@type': 'City',
          name: 'Glasgow',
        },
        hasMenu: `${SITE_URL}/#menu`,
        sameAs: [INSTAGRAM_URL, GOOGLE_REVIEW_URL],
        founder: {
          '@type': 'Person',
          name: 'Samantha Hamilton',
        },
      },
      {
        '@type': 'Service',
        serviceType: 'Catering',
        name: 'Root & Fuel Catering',
        description: 'Bespoke whole-food catering for corporate events, sports teams and private functions in Glasgow.',
        provider: { '@id': `${SITE_URL}/#business` },
        areaServed: {
          '@type': 'City',
          name: 'Glasgow',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Root &amp; Fuel — Performance Nutrition &amp; Health Food, Glasgow</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="description" content="Performance nutrition and health food meal prep, delivered fresh in Glasgow. Order online from Root & Fuel — whole-food meals, poke bowls and catering." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={CREAM} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Root &amp; Fuel — Performance Nutrition &amp; Health Food, Glasgow" />
        <meta property="og:description" content="Performance nutrition and health food meal prep, delivered fresh in Glasgow. Order online from Root & Fuel." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/logo.png`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <div style={{ background: CREAM, minHeight: '100vh', color: '#1a2418' }}>

        {/* Delivery banner */}
        <div className={styles.tuesdayBanner} style={{ background: '#0f0f0f' }}>
          <strong>Orders are delivered 8am–12pm on your delivery date.</strong>{' '}
          Tuesday delivery (order Wed–Fri).
        </div>



        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <a className={styles.logo} href="/">
              <img src="/logo.png" alt="Root + Fuel" className={styles.logoImg} />
            </a>
            <div className={styles.headerRight}>
              <nav className={styles.desktopNav}>
                {availableCategories.map(cat => (
                  <button
                    key={cat.name}
                    className={`${styles.navLink} ${activeCategory === cat.name ? styles.navLinkActive : ''}`}
                    onClick={() => switchCategory(cat.name)}
                  >{cat.name}</button>
                ))}
                <button className={styles.navLink} onClick={scrollToAbout}>About</button>
                <button className={styles.navLink} onClick={() => setShowCatering(true)}>Catering</button>
                <button className={styles.navLink} onClick={scrollToFaq}>FAQ</button>
                <Link className={styles.navLink} href="/blog">Blog</Link>
                <a className={styles.navIconLink} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow Root + Fuel on Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5.5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </nav>
              <button
                className={`${styles.cartBtn} ${cartBounce ? styles.bounce : ''} ${cartCount > 0 ? styles.cartBtnActive : ''}`}
                onClick={() => { setShowCart(true); setMobileMenuOpen(false); }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                {cartCount > 0 && <span className={styles.cartPrice}>£{cartTotal.toFixed(2)}</span>}
              </button>
              <button
                className={`${styles.hamburger} ${mobileMenuOpen ? styles.hamburgerOpen : ''}`}
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label="Toggle menu"
              >
                <span className={styles.hamburgerLine} />
                <span className={styles.hamburgerLine} />
                <span className={styles.hamburgerLine} />
              </button>
            </div>
          </div>

          {/* Mobile menu — anchored to the header itself (not a fixed pixel
              offset) so it always sits flush below it, regardless of how
              tall the announcement banner above renders (it can wrap to two
              lines on narrow screens). */}
          {mobileMenuOpen && (
            <>
              <div className={styles.mobileMenuOverlay} onClick={() => setMobileMenuOpen(false)} />
            <div className={styles.mobileMenu} style={{ background: WHITE }}>
              <div className={styles.mobileMenuInner} style={{ background: WHITE }}>
                <div>
                  <p className={styles.mobileCatLabel}>Browse Menu</p>
                  <div className={styles.mobileCatGrid}>
                    {availableCategories.map(cat => (
                      <button
                        key={cat.name}
                        className={`${styles.mobileCatBtn} ${activeCategory === cat.name ? styles.mobileCatActive : ''}`}
                        onClick={() => switchCategory(cat.name)}
                      >
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.mobileLinkList}>
                  <button className={styles.mobileAboutLink} onClick={scrollToAbout}>
                    <span className={styles.mobileLinkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    </span>
                    <span className={styles.mobileLinkLabel}>About Root + Fuel</span>
                    <svg className={styles.mobileLinkChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  <button className={styles.mobileAboutLink} onClick={() => { setShowCatering(true); setMobileMenuOpen(false); }}>
                    <span className={styles.mobileLinkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M3 11v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M8 9V7a4 4 0 0 1 8 0v2" /></svg>
                    </span>
                    <span className={styles.mobileLinkLabel}>Catering Services</span>
                    <svg className={styles.mobileLinkChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  <button className={styles.mobileAboutLink} onClick={scrollToFaq}>
                    <span className={styles.mobileLinkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.67-2.5 2-2.5 4M12 17h.01" /></svg>
                    </span>
                    <span className={styles.mobileLinkLabel}>FAQ</span>
                    <svg className={styles.mobileLinkChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  <Link className={styles.mobileAboutLink} href="/blog" onClick={() => setMobileMenuOpen(false)}>
                    <span className={styles.mobileLinkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" /></svg>
                    </span>
                    <span className={styles.mobileLinkLabel}>Blog</span>
                    <svg className={styles.mobileLinkChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                  <a className={styles.mobileAboutLink} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                    <span className={styles.mobileLinkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                    </span>
                    <span className={styles.mobileLinkLabel}>Instagram</span>
                    <svg className={styles.mobileLinkChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </a>
                </div>
                {cartCount > 0 && (
                  <div className={styles.mobileCartBar} onClick={() => { setShowCart(true); setMobileMenuOpen(false); }}>
                    <div className={styles.mobileCartBarLeft}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                      <span className={styles.mobileCartBarLabel}>Your Order</span>
                      <span className={styles.mobileCartBarCount}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <span className={styles.mobileCartBarPrice}>£{cartTotal.toFixed(2)}</span>
                  </div>
                )}
                {cartCount > 0 && (
                  <button className={styles.mobileOrderBtn} onClick={() => { setShowForm(true); setMobileMenuOpen(false); }}>
                    Checkout · £{cartTotal.toFixed(2)}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                )}
              </div>
            </div>
            </>
          )}
        </header>

        {/* Hero */}
        <section
          className={styles.hero}
          style={{ background: 'linear-gradient(155deg,#eaf4e8 0%,#f5f1ea 55%,#ede9e0 100%)' }}
        >
          <div className={styles.heroBg} />
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Fuel your<br />
                <span className={styles.heroTitleAccent}>performance</span>
              </h1>
              <p className={styles.heroSub}>
                Meal prep and catering services. Performance nutrition, rooted in nature.
                Locally sourced, whole food focussed, created for those who demand more from what they eat.
              </p>

              {/* Countdown Timers */}
              <div style={{ margin: '28px 0 24px', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {locked ? (
                  <div style={{
                    background: 'rgba(180,30,30,0.08)',
                    border: '1px solid rgba(180,30,30,0.2)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#b41e1e', marginBottom: '6px' }}>
                        {lockSource === 'holiday' ? 'Holiday Closure' : 'Orders Closed'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#7a3a3a', lineHeight: 1.5 }}>
                        {lockReason}
                      </div>
                    </div>
                  </div>
                ) : !tuesdayOpen ? (
                  <div style={{
                    background: 'rgba(180,30,30,0.08)',
                    border: '1px solid rgba(180,30,30,0.2)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#b41e1e', marginBottom: '6px' }}>
                        Orders Closed
                      </div>
                      <div style={{ fontSize: '14px', color: '#7a3a3a', lineHeight: 1.5 }}>
                        Tuesday delivery ordering opens Wednesday and runs through Friday midnight.
                      </div>
                    </div>
                  </div>
                ) : tuesdayTimeLeft ? (
                  <div style={{
                    background: 'rgba(45,107,39,0.08)',
                    border: '1px solid rgba(45,107,39,0.2)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, marginBottom: '10px' }}>
                      Tuesday delivery — order by Friday midnight
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {[
                        { val: tuesdayTimeLeft.days,    label: 'Days' },
                        { val: tuesdayTimeLeft.hours,   label: 'Hrs' },
                        { val: tuesdayTimeLeft.minutes, label: 'Min' },
                        { val: tuesdayTimeLeft.seconds, label: 'Sec' },
                      ].map((t, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{
                            background: WHITE,
                            borderRadius: '10px',
                            padding: '8px 4px 6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                            fontFamily: 'monospace',
                            fontSize: 'clamp(18px, 3.5vw, 26px)',
                            fontWeight: 700,
                            color: '#1a2418',
                            lineHeight: 1,
                          }}>{pad(t.val)}</div>
                          <div style={{ fontSize: '9px', color: '#8a9e87', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Promo codes box — same style as countdown, only shown when codes are active */}
              {promos.length > 0 && (
                <div style={{
                  margin: '0 0 24px',
                  background: 'rgba(45,107,39,0.08)',
                  border: '1px solid rgba(45,107,39,0.2)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  maxWidth: '420px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>
                    Current discount{promos.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {promos.map(p => (
                      <button
                        key={p.code}
                        onClick={() => copyPromoCode(p.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          background: WHITE,
                          border: '1px solid rgba(45,107,39,0.18)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          gap: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: '#1a2418', letterSpacing: '1px', lineHeight: 1 }}>
                            {p.code}
                          </div>
                          <div style={{ fontSize: '13px', color: GREEN, fontWeight: 500, marginTop: '4px' }}>
                            {p.discount.type === 'percent'
                              ? `${p.discount.amount}% off your order`
                              : `£${p.discount.amount.toFixed(2)} off your order`}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: GREEN, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {copiedCode === p.code ? '✓ Copied!' : 'Tap to copy →'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!locked && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className={styles.heroCta} onClick={scrollToMenu}>
                    Order Now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                  </button>
                  <a className={styles.heroCtaSecondary} href={`tel:${PHONE}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Call Now
                  </a>
                </div>
              )}
            </div>
            <div className={styles.heroImageWrap}>
              {FOOD_IMAGES.length > 0 ? (
                <div className={styles.heroCarousel}>
                  {FOOD_IMAGES.map((src, i) => (
                    <div
                      key={src}
                      className={`${styles.heroCarouselSlide} ${i === carouselIndex ? styles.active : ''}`}
                    >
                      <picture>
                        <source srcSet={src.replace(/\.jpg$/, '.webp')} type="image/webp" />
                        <img src={src} alt={`Root + Fuel dish ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
                      </picture>
                    </div>
                  ))}
                  <div className={styles.heroCarouselDots}>
                    {FOOD_IMAGES.map((_, i) => (
                      <button
                        key={i}
                        className={`${styles.heroCarouselDot} ${i === carouselIndex ? styles.activeDot : ''}`}
                        onClick={() => setCarouselIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.heroCarousel}>
                  <div className={styles.heroCarouselFallback}>
                    <img src="/logo.png" alt="Root + Fuel" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" style={{ background: WHITE, borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '88px 28px', scrollMarginTop: '70px' }}>
          <div className={styles.aboutInner}>
            <div className={styles.revealLeft}>
              <span className={styles.aboutLabel}>Our Story</span>
              <h2 className={styles.aboutTitle}>
                I didn&apos;t start Root &amp; Fuel<br />because it was <em>easy</em>
              </h2>
              <p className={styles.aboutLead}>
                I&apos;m Samantha, a 35-year-old mum of two, with a lifelong love of cooking — but it wasn&apos;t until 2020 that food became something much deeper than just flavour. After being diagnosed with ADHD and struggling with ongoing gut issues including IBS, endometriosis, chronic bloating, and persistent stomach pain, I was forced to take a hard look at what I was putting into my body.
              </p>
              <p className={styles.aboutText}>
                What I found was simple, but powerful: the more I relied on overly processed foods, the worse I felt — physically, mentally, and hormonally. So, I started to change things.
              </p>
              <p className={styles.aboutText}>
                When I had my first baby in 2021, I began focusing on whole, nourishing foods for my family. I kept a food diary, tracked how different ingredients made me feel, and slowly built a way of eating that supported not just my body, but my brain too. The difference was undeniable — more energy, better focus, less discomfort, and a completely different relationship with food.
              </p>
              <p className={styles.aboutText}>
                Fast forward to 2025, I was given the opportunity to step away from the corporate world and build something of my own — something that genuinely mattered. Root &amp; Fuel is the result of that journey.
              </p>
              <p className={styles.aboutText}>
                We are a small, family run business with a clear mission: to make real, fresh, nourishing food more accessible for busy people — without compromising on quality, flavour, or nutrition. Whether you&apos;re a busy parent, a corporate professional, or someone trying to fuel an active lifestyle, we bridge the gap between convenience and quality.
              </p>
              <p className={styles.aboutText}>
                Nothing we do is overly complicated or pretentious. It&apos;s simply good food, made with intention and purpose. Because when you eat better, you feel better. And when you feel better, everything else starts to follow.
              </p>
            </div>
            <div className={`${styles.aboutVisual} ${styles.revealRight}`}>
              <div className={styles.aboutVisualCard} style={{ background: 'linear-gradient(145deg,#eaf4e8 0%,#f5f1ea 100%)' }}>
                <div className={styles.aboutVisualPattern} />
                <img src="/logo.png" alt="Root + Fuel" className={styles.aboutLogoLarge} />
                <p className={styles.aboutTagline}>&ldquo;Performance nutrition,<br />rooted in nature.&rdquo;</p>
              </div>
            </div>
          </div>
        </section>

        {/* Menu */}
        <div style={{ background: CREAM, width: '100%' }}>
          <main id="menu" style={{ background: CREAM, maxWidth: '1180px', margin: '0 auto', padding: '60px 28px 110px', scrollMarginTop: '70px' }}>

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our <span className={styles.sectionTitleSub}>Menu</span></h2>
              <nav className={styles.catNav}>
                {availableCategories.map(cat => (
                  <button
                    key={cat.name}
                    className={`${styles.catBtn} ${activeCategory === cat.name ? styles.catActive : ''}`}
                    onClick={() => setActiveCategory(cat.name)}
                  >{cat.name}</button>
                ))}
              </nav>
            </div>
            {loading ? (
              <div className={styles.loadingGrid}>
                {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : (
              <div className={styles.grid}>
                {categoryItems.map((item, i) => (
                  <MenuItem
                    key={item.name}
                    item={item}
                    quantity={cart.find(c => c.name === item.name)?.quantity || 0}
                    onAdd={() => addToCart(item)}
                    onRemove={() => removeFromCart(item)}
                    delay={i * 60}
                    locked={orderingClosed}
                  />
                ))}
                {categoryItems.length === 0 && <p className={styles.empty}>Nothing here right now.</p>}
              </div>
            )}
          </main>
        </div>

        {/* Past & Current Creations */}
        {showcaseItems.length > 0 && (
          <section style={{ background: CREAM, borderTop: '1px solid rgba(0,0,0,0.08)', padding: '72px 28px', textAlign: 'center' }}>
            <span className={`${styles.aboutLabel} ${styles.reveal}`}>Our Creations</span>
            <h2 className={styles.reveal} style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(30px, 4.5vw, 40px)',
              fontWeight: 400,
              color: '#1a2418',
              margin: '6px 0 14px',
              transitionDelay: '80ms',
            }}>
              Past &amp; <span style={{ color: GREEN, fontStyle: 'italic' }}>current</span> creations
            </h2>
            <p className={styles.reveal} style={{ fontSize: '15px', color: '#7a8f77', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.7, transitionDelay: '140ms' }}>
              A look at what we&apos;re making now — and a few favourites from before.
            </p>

            {currentShowcaseItems.length > 0 && pastShowcaseItems.length > 0 && (
              <div className={styles.showcaseTabs}>
                <button
                  className={`${styles.showcaseTabBtn} ${showcaseTab === 'current' ? styles.showcaseTabActive : ''}`}
                  onClick={() => setShowcaseTab('current')}
                >
                  Current ({currentShowcaseItems.length})
                </button>
                <button
                  className={`${styles.showcaseTabBtn} ${showcaseTab === 'past' ? styles.showcaseTabActive : ''}`}
                  onClick={() => setShowcaseTab('past')}
                >
                  Past ({pastShowcaseItems.length})
                </button>
              </div>
            )}

            <div className={styles.showcaseGrid}>
              {activeShowcaseItems.map((item, i) => (
                <div key={item.id} className={`${styles.showcaseCard} ${styles.liftCard}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={styles.showcaseImageWrap}>
                    <img src={item.image} alt={item.title} loading="lazy" />
                    <span className={`${styles.showcaseBadge} ${item.status === 'past' ? styles.showcaseBadgePast : ''}`}>
                      {item.status === 'current' ? 'Current' : 'Past'}
                    </span>
                  </div>
                  <div className={styles.showcaseCardBody}>
                    <p className={styles.showcaseCardTitle}>{item.title}</p>
                    {item.description && <p className={styles.showcaseCardDesc}>{item.description}</p>}
                  </div>
                </div>
              ))}
              {activeShowcaseItems.length === 0 && (
                <p className={styles.empty}>Nothing here yet.</p>
              )}
            </div>
          </section>
        )}

        {/* Find Us Nearby */}
        <section style={{ background: WHITE, borderTop: '1px solid rgba(0,0,0,0.08)', padding: '72px 28px', textAlign: 'center' }}>
          <span className={`${styles.aboutLabel} ${styles.reveal}`}>Stockists</span>
          <h2 className={styles.reveal} style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(30px, 4.5vw, 40px)',
            fontWeight: 400,
            color: '#1a2418',
            margin: '6px 0 14px',
            transitionDelay: '80ms',
          }}>
            Find us <span style={{ color: GREEN, fontStyle: 'italic' }}>nearby</span>
          </h2>
          <p className={styles.reveal} style={{ fontSize: '15px', color: '#7a8f77', maxWidth: '480px', margin: '0 auto 40px', lineHeight: 1.7, transitionDelay: '140ms' }}>
            Can&apos;t wait for delivery day? Grab Root &amp; Fuel from one of these local stockists.
          </p>
          <div className={styles.stockistsGrid}>
            {STOCKISTS.map((s, i) => (
              <div key={s.name} className={`${styles.reveal} ${styles.liftCard}`} style={{
                background: CREAM,
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '16px',
                padding: '28px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                transitionDelay: `${i * 80}ms`,
              }}>
                <div style={{
                  position: 'relative', width: '72px', height: '72px', borderRadius: '50%',
                  background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
                  boxSizing: 'border-box', overflow: 'hidden',
                  padding: s.fit === 'contain' ? '12px' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={s.logo}
                    alt={`${s.name} logo`}
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: s.fit || 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{
                    display: 'none',
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    background: '#eaf4e8', border: '1px solid rgba(45,107,39,0.2)',
                    color: GREEN, alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '22px',
                  }}>
                    {getInitials(s.name)}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a2418', marginBottom: '4px' }}>{s.name}</p>
                  <p style={{ fontSize: '13px', color: '#7a8f77', marginBottom: '12px' }}>{s.address}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.popBtn} ${styles.directionsBtn}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 600, color: GREEN,
                    border: `1px solid ${GREEN}`, borderRadius: '100px',
                    padding: '7px 14px', textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Get Directions
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Follow us on Instagram */}
        <section style={{ background: CREAM, borderTop: '1px solid rgba(0,0,0,0.08)', padding: '72px 28px', textAlign: 'center' }}>
          <span className={`${styles.aboutLabel} ${styles.reveal}`}>Instagram</span>
          <h2 className={styles.reveal} style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(30px, 4.5vw, 40px)',
            fontWeight: 400,
            color: '#1a2418',
            margin: '6px 0 14px',
            transitionDelay: '80ms',
          }}>
            Follow us <span style={{ color: GREEN, fontStyle: 'italic' }}>@rootandfuel</span>
          </h2>
          <p className={styles.reveal} style={{ fontSize: '15px', color: '#7a8f77', maxWidth: '480px', margin: '0 auto 40px', lineHeight: 1.7, transitionDelay: '140ms' }}>
            Behind-the-scenes prep, new dishes and the odd delivery-day chaos — straight from our Instagram.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto 36px',
          }}>
            {FEATURED_INSTAGRAM_POSTS.map(url => (
              <InstagramEmbed key={url} url={url} />
            ))}
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.popBtn}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'transparent', color: GREEN,
              border: `1px solid ${GREEN}`, padding: '12px 26px',
              borderRadius: '100px', fontSize: '14px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Follow on Instagram
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ background: WHITE, borderTop: '1px solid rgba(0,0,0,0.08)', padding: '72px 28px', scrollMarginTop: '70px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <span className={`${styles.aboutLabel} ${styles.reveal}`}>FAQ</span>
            <h2 className={styles.reveal} style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(30px, 4.5vw, 40px)',
              fontWeight: 400,
              color: '#1a2418',
              margin: '6px 0 32px',
            }}>
              Frequently asked <span style={{ color: GREEN, fontStyle: 'italic' }}>questions</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {FAQS.map(f => (
                <div key={f.question} className={styles.reveal} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2418', marginBottom: '8px' }}>{f.question}</h3>
                  <p style={{ fontSize: '14.5px', color: '#5c6e58', lineHeight: 1.7 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky order — hidden when locked */}
        {cartCount > 0 && !mobileMenuOpen && !locked && (
          <div className={styles.stickyOrder}>
            <button className={styles.orderBtn} onClick={() => setShowForm(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
              <span className={styles.orderBtnDivider} />
              £{cartTotal.toFixed(2)}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}

        {showCart  && <Cart cart={cart} onAdd={addToCart} onRemove={removeFromCart} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); setShowForm(true); }} />}
        {showForm  && !locked && <OrderForm cart={cart} onClose={() => setShowForm(false)} tuesdayOpen={tuesdayOpen} onRemoveStaleItems={removeStaleItems} />}
        {showCatering && <CateringModal onClose={() => setShowCatering(false)} />}

        {/* Catering Banner */}
        <div className={styles.reveal} style={{
          background: '#1a2418',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '48px 28px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(26px, 4vw, 44px)',
            fontWeight: 400,
            color: '#ffffff',
            marginBottom: '10px',
            fontStyle: 'italic',
          }}>
            Planning an event?
          </p>
          <p style={{
            fontSize: '15px', color: 'rgba(255,255,255,0.6)',
            marginBottom: '24px', maxWidth: '460px', margin: '0 auto 24px',
            lineHeight: 1.7,
          }}>
            We offer bespoke catering for corporate events, sports teams, and private functions — all built on whole food performance nutrition.
          </p>
          <button
            onClick={() => setShowCatering(true)}
            className={styles.popBtn}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #2d6b27, #4a9e40)',
              color: 'white', border: 'none', padding: '14px 30px',
              borderRadius: '100px', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,107,39,0.4)',
            }}
          >
            Enquire about catering
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={`${styles.footerBrand} ${styles.reveal}`}>
              <img src="/logo.png" alt="Root + Fuel" className={styles.footerLogo} />
              <p className={styles.footerTagline}>Performance nutrition, rooted in nature.</p>
              <p className={styles.footerLocation}>All Tots Nursery, 64 Cowdenhill Rd, Glasgow G13 2HE</p>
            </div>
            <div className={`${styles.footerCol} ${styles.reveal}`} style={{ transitionDelay: '80ms' }}>
              <p className={styles.footerColTitle}>Menu</p>
              {availableCategories.map(cat => (
                <button key={cat.name} className={styles.footerLink} onClick={() => switchCategory(cat.name)}>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className={`${styles.footerCol} ${styles.reveal}`} style={{ transitionDelay: '140ms' }}>
              <p className={styles.footerColTitle}>Info</p>
              <Link className={styles.footerLink} href="/about">About Us</Link>
              <button className={styles.footerLink} onClick={scrollToMenu}>Order Online</button>
              <button className={styles.footerLink} onClick={() => setShowCatering(true)}>Catering Services</button>
              <button className={styles.footerLink} onClick={scrollToFaq}>FAQ</button>
              <Link className={styles.footerLink} href="/blog">Blog</Link>
              <Link className={styles.footerLink} href="/contact">Contact</Link>
            </div>
            <div className={`${styles.footerCol} ${styles.reveal}`} style={{ transitionDelay: '200ms' }}>
              <p className={styles.footerColTitle}>Ordering</p>
              <p className={styles.footerInfo}>
                <strong>Delivery day</strong><br />
                Tuesday (order Wed–Fri).
              </p>
              <p className={styles.footerInfo}>
                <strong>Call us</strong><br />
                <a className={styles.footerLink} href={`tel:${PHONE}`} style={{ display: 'inline' }}>{PHONE_DISPLAY}</a>
              </p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} Root + Fuel. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '18px' }}>
              <Link className={styles.footerLink} href="/privacy-policy" style={{ fontSize: '12.5px' }}>Privacy Policy</Link>
              <Link className={styles.footerLink} href="/terms" style={{ fontSize: '12.5px' }}>Terms</Link>
            </div>
            <p className={styles.footerMade}>Whole food · Locally sourced · Glasgow</p>
          </div>
        </footer>

      </div>
    </>
  );
}
