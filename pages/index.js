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
];

const CREAM = '#f5f1ea';
const WHITE = '#ffffff';
const GREEN = '#2d6b27';

/**
 * Ordering schedule:
 *   Wed 00:00 → Mon 23:59:59  — OPEN   (countdown to Monday midnight)
 *   Tue 00:00 → Tue 23:59:59  — LOCKED (orders being fulfilled)
 *
 * "Monday midnight" means the very end of Monday, i.e. 23:59:59 on Monday.
 * Orders lock the moment Tuesday begins (00:00:00).
 * Orders reopen the moment Wednesday begins (00:00:00).
 */
function getOrderingStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat

  // Locked all day Tuesday
  if (day === 2) return { locked: true, target: null };

  // Build the target: end of this coming Monday (23:59:59.999)
  // "coming Monday" means the next Monday from today, or today if today is Monday
  let daysUntilMonday = (1 - day + 7) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 0; // today is Monday
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilMonday);
  target.setHours(23, 59, 59, 999);

  // If we've passed Monday midnight — should already be Tue and caught above,
  // but guard just in case of clock drift
  if (now >= target && day === 1) return { locked: true, target: null };

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
          Place your order by Monday midnight for Tuesday pickup or delivery.
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
                      Ordering is closed while we fulfil this week's batch. Orders reopen Wednesday at midnight for next Tuesday's collection or delivery.
                    </div>
                  </div>
                ) : timeLeft ? (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>
                      Order deadline — Monday midnight
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
                Nutrition that <em>performs</em><br />as hard as you do
              </h2>
              <p className={styles.aboutText}>
                Root + Fuel was born from a simple belief, that real, whole food is the most powerful performance tool available. We source locally from Glasgow&apos;s finest producers and craft every dish with intention, keeping ingredients clean, honest, and nutrient-dense.
              </p>
              <p className={styles.aboutText}>
                Every Tuesday we prepare a fresh batch of orders ready for collection or delivery. No compromise, no shortcuts, just food that genuinely fuels your body and your goals.
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
                Orders are currently closed while we fulfil this week's batch. Browse the menu below — ordering reopens Wednesday at midnight.
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
            We offer bespoke catering for corporate events, sports teams, and private functions, all built on whole food performance nutrition.
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
              <p className={styles.footerLocation}>Glasgow, Scotland</p>
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
                Order by Monday midnight for Tuesday collection or delivery.
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