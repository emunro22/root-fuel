import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Cart from '../components/Cart';
import MenuItem from '../components/MenuItem';
import OrderForm from '../components/OrderForm';
import CateringModal from '../components/CateringModal';

const CATEGORIES = [
  { name: 'Starters',       icon: '' },
  { name: 'Mains',          icon: '' },
  { name: 'Desserts',       icon: '' },
  { name: 'Overnight Oats', icon: '' },
  { name: 'Poke Bowls',     icon: '' },
  { name: 'Grab & Go',      icon: '' },
];

const CREAM = '#f5f1ea';
const WHITE = '#ffffff';
const GREEN = '#2d6b27';

/**
 * Ordering schedule:
 *   Wed 00:00 → Sat 23:59:59  — OPEN   (countdown to Saturday midnight)
 *   Sun 00:00 → Tue 23:59:59  — LOCKED (orders closed)
 *
 * Cutoff is Saturday midnight. Orders reopen Wednesday morning.
 */
function getOrderingStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat

  // Locked Sunday (0), Monday (1), Tuesday (2)
  if (day === 0 || day === 1 || day === 2) return { locked: true, target: null };

  // Build the target: end of this coming Saturday (23:59:59.999)
  const daysUntilSaturday = (6 - day + 7) % 7; // 0 if today is Saturday
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSaturday);
  target.setHours(23, 59, 59, 999);

  // Guard: if we've somehow passed Saturday midnight
  if (now >= target && day === 6) return { locked: true, target: null };

  return { locked: false, target };
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const tick = () => {
      const { locked: isLocked, target } = getOrderingStatus();

      if (isLocked || !target) {
        setLocked(true);
        setTimeLeft(null);
        return;
      }

      const diff = target - new Date();
      if (diff <= 0) {
        setLocked(true);
        setTimeLeft(null);
        return;
      }

      setLocked(false);
      const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { timeLeft, locked };
}

export default function Home() {
  const [menu,           setMenu]           = useState([]);
  const [cart,           setCart]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('Mains');
  const [showCart,       setShowCart]       = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [cartBounce,     setCartBounce]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCatering,   setShowCatering]   = useState(false);

  const { timeLeft, locked } = useCountdown();

  // ── Hero food image carousel ──────────────────────────────────────────────
  // Add your food photo filenames to /public/food/ and list them here.
  const FOOD_IMAGES = [
    '/food/dish1.jpg',
    '/food/dish2.jpg',
    '/food/dish3.jpg',
    '/food/dish4.jpg',
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
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => { setMenu(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
    if (locked) return;
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing) return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 400);
  }, [locked]);

  const removeFromCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing?.quantity === 1) return prev.filter(c => c.name !== item.name);
      return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const categoryItems = menu.filter(i => i.category === activeCategory);
  const availableCategories = CATEGORIES.filter(cat => menu.some(i => i.category === cat.name));

  const scrollToMenu  = () => { document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const scrollToAbout = () => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const switchCategory = (cat) => {
    setActiveCategory(cat);
    setMobileMenuOpen(false);
    setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const pad = n => String(n).padStart(2, '0');

  return (
    <>
      <Head>
        <title>Root &amp; Fuel — Order Online</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="description" content="Performance nutrition, rooted in nature. Order online from Root & Fuel, Glasgow." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={CREAM} />
      </Head>
      <div style={{ background: CREAM, minHeight: '100vh', color: '#1a2418' }}>

        {/* Tuesday banner */}
        <div className={styles.tuesdayBanner} style={{ background: '#0f0f0f' }}>
          🗓️ <strong>Orders &amp; collections are available on Tuesdays only.</strong>{' '}
          Place your order by Saturday midnight for Tuesday pickup or delivery.
        </div>

        {/* Welcome / what we do banner */}
        <div style={{
          background: WHITE,
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {[
            { icon: '🥗', label: 'Fresh Meal Prep' },
            { icon: '🍱', label: 'Weekly Batch Cooking' },
            { icon: '🤸', label: 'Performance Nutrition' },
            { icon: '🍽️', label: 'Event Catering' },
            { icon: '🌿', label: 'Whole Food Only' },
            { icon: '📍', label: 'Glasgow Delivery & Collection' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12.5px', color: '#3d5239', fontWeight: 500,
                letterSpacing: '0.2px',
              }}>
                <span style={{ fontSize: '14px' }}>{item.icon}</span>
                {item.label}
              </div>
              {i < arr.length - 1 && (
                <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: '14px' }}>·</span>
              )}
            </div>
          ))}
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
        </header>

        {/* Mobile menu */}
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
                <button className={styles.mobileAboutLink} onClick={scrollToAbout}>About Root + Fuel</button>
                <button className={styles.mobileAboutLink} onClick={() => { setShowCatering(true); setMobileMenuOpen(false); }}>
                  Catering Services
                </button>
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
                Performance nutrition rooted in nature. Fresh, whole food crafted for those who demand more from what they eat.
              </p>

              {/* Countdown Timer */}
              <div style={{
                margin: '28px 0 24px',
                background: locked ? 'rgba(180,30,30,0.08)' : 'rgba(45,107,39,0.08)',
                border: `1px solid ${locked ? 'rgba(180,30,30,0.2)' : 'rgba(45,107,39,0.2)'}`,
                borderRadius: '16px',
                padding: '20px 24px',
                maxWidth: '420px',
              }}>
                {locked ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#b41e1e', marginBottom: '6px' }}>
                      Orders Closed
                    </div>
                    <div style={{ fontSize: '14px', color: '#7a3a3a', lineHeight: 1.5 }}>
                      Ordering is closed while we fulfil this week's batch. Orders reopen Wednesday for next Tuesday's collection or delivery.
                    </div>
                  </div>
                ) : timeLeft ? (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>
                      Order deadline — Saturday midnight
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {[
                        { val: timeLeft.days,    label: 'Days' },
                        { val: timeLeft.hours,   label: 'Hrs' },
                        { val: timeLeft.minutes, label: 'Min' },
                        { val: timeLeft.seconds, label: 'Sec' },
                      ].map((t, i) => (
                        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{
                            background: WHITE,
                            borderRadius: '10px',
                            padding: '10px 4px 8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                            fontFamily: 'monospace',
                            fontSize: 'clamp(22px, 4vw, 32px)',
                            fontWeight: 700,
                            color: '#1a2418',
                            lineHeight: 1,
                          }}>{pad(t.val)}</div>
                          <div style={{ fontSize: '10px', color: '#8a9e87', marginTop: '5px', letterSpacing: '1px', textTransform: 'uppercase' }}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {!locked && (
                <button className={styles.heroCta} onClick={scrollToMenu}>
                  View Menu
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12l7 7 7-7"/>
                  </svg>
                </button>
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
                      <img src={src} alt={`Root + Fuel dish ${i + 1}`} />
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
            <div>
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
            <div className={styles.aboutVisual}>
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

            {/* Locked banner inside menu section */}
            {locked && (
              <div style={{
                background: '#fff3f3',
                border: '1px solid rgba(180,30,30,0.2)',
                borderRadius: '12px',
                padding: '18px 24px',
                marginBottom: '32px',
                textAlign: 'center',
                color: '#b41e1e',
                fontWeight: 500,
                fontSize: '15px',
              }}>
                Orders are currently closed while we fulfil this week's batch. Browse the menu below — ordering reopens Wednesday for next Tuesday.
              </div>
            )}

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
                    locked={locked}
                  />
                ))}
                {categoryItems.length === 0 && <p className={styles.empty}>Nothing here right now.</p>}
              </div>
            )}
          </main>
        </div>

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
        {showForm  && !locked && <OrderForm cart={cart} onClose={() => setShowForm(false)} />}
        {showCatering && <CateringModal onClose={() => setShowCatering(false)} />}

        {/* Catering Banner */}
        <div style={{
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
            <div className={styles.footerBrand}>
              <img src="/logo.png" alt="Root + Fuel" className={styles.footerLogo} />
              <p className={styles.footerTagline}>Performance nutrition, rooted in nature.</p>
              <p className={styles.footerLocation}>All Tots Nursery, 64 Cowdenhill Rd, Glasgow G13 2HE</p>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Menu</p>
              {availableCategories.map(cat => (
                <button key={cat.name} className={styles.footerLink} onClick={() => switchCategory(cat.name)}>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Info</p>
              <button className={styles.footerLink} onClick={scrollToAbout}>About Us</button>
              <button className={styles.footerLink} onClick={scrollToMenu}>Order Online</button>
              <button className={styles.footerLink} onClick={() => setShowCatering(true)}>Catering Services</button>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Ordering</p>
              <p className={styles.footerInfo}>
                <strong>Tuesdays only</strong><br />
                Order by Saturday midnight for Tuesday collection or delivery.
              </p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} Root + Fuel. All rights reserved.</p>
            <p className={styles.footerMade}>Whole food · Locally sourced · Glasgow</p>
          </div>
        </footer>

      </div>
    </>
  );
}