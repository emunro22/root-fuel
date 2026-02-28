import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Cart from '../components/Cart';
import MenuItem from '../components/MenuItem';
import OrderForm from '../components/OrderForm';

const CATEGORIES = [
  { name: 'Starters', icon: '🥗' },
  { name: 'Mains',    icon: '🍽️' },
  { name: 'Desserts', icon: '🍮' },
];

const CREAM = '#f5f1ea';
const WHITE = '#ffffff';
const GREEN = '#2d6b27';

export default function Home() {
  const [menu,           setMenu]           = useState([]);
  const [cart,           setCart]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('Starters');
  const [showCart,       setShowCart]       = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [cartBounce,     setCartBounce]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing) return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 400);
  }, []);

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

  const scrollToMenu = () => { document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const scrollToAbout = () => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  const switchCategory = (cat) => {
    setActiveCategory(cat);
    setMobileMenuOpen(false);
    setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <>
      <Head>
        <title>Root &amp; Fuel — Order Online</title>
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
              <img
                src="/logo.png"
                alt="Root + Fuel"
                className={styles.logoImg}
              />
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
                        <span className={styles.mobileCatIcon}>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button className={styles.mobileAboutLink} onClick={scrollToAbout}>About Root + Fuel</button>
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

        {/* Hero — two column layout with logo on right */}
        <section
          className={styles.hero}
          style={{ background: 'linear-gradient(155deg,#eaf4e8 0%,#f5f1ea 55%,#ede9e0 100%)' }}
        >
          <div className={styles.heroBg} />
          <div className={styles.heroGrid} />
          <div className={styles.heroInner}>
            {/* Left: text */}
            <div className={styles.heroContent}>
              <div className={styles.heroEyebrow}>
                <span>🌿</span> Glasgow · Whole Food · Locally Sourced
              </div>
              <h1 className={styles.heroTitle}>
                Fuel your<br />
                <span className={styles.heroTitleAccent}>performance</span>
              </h1>
              <p className={styles.heroSub}>
                Performance nutrition rooted in nature. Fresh, whole food crafted for those who demand more from what they eat.
              </p>
              <button className={styles.heroCta} onClick={scrollToMenu}>
                View Menu
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </button>
              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <div className={styles.heroStatNum}>{loading ? '—' : menu.length}</div>
                  <div className={styles.heroStatLabel}>Menu Items</div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.heroStatNum}>2</div>
                  <div className={styles.heroStatLabel}>Order Types</div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.heroStatNum}>100%</div>
                  <div className={styles.heroStatLabel}>Whole Food</div>
                </div>
              </div>
            </div>
            {/* Right: logo image */}
            <div className={styles.heroImageWrap}>
              <img src="/logo.png" alt="Root + Fuel" className={styles.heroImage} />
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
                Root + Fuel was born from a simple belief — that real, whole food is the most powerful performance tool available. We source locally from Glasgow&apos;s finest producers and craft every dish with intention, keeping ingredients clean, honest, and nutrient-dense.
              </p>
              <p className={styles.aboutText}>
                Every Tuesday we prepare a fresh batch of orders ready for collection or delivery. No compromise, no shortcuts — just food that genuinely fuels your body and your goals.
              </p>
              <div className={styles.aboutPillars}>
                <div className={styles.aboutPillar}>
                  <div className={styles.aboutPillarIcon}>🌱</div>
                  <div className={styles.aboutPillarTitle}>Whole Foods Only</div>
                  <div className={styles.aboutPillarText}>No ultra-processed ingredients. Every item is as close to its natural state as possible.</div>
                </div>
                <div className={styles.aboutPillar}>
                  <div className={styles.aboutPillarIcon}>📍</div>
                  <div className={styles.aboutPillarTitle}>Locally Sourced</div>
                  <div className={styles.aboutPillarText}>We work with local Glasgow and Scottish suppliers wherever possible.</div>
                </div>
                <div className={styles.aboutPillar}>
                  <div className={styles.aboutPillarIcon}>💪</div>
                  <div className={styles.aboutPillarTitle}>Performance Focused</div>
                  <div className={styles.aboutPillarText}>Recipes built around macro balance and micronutrient density for active people.</div>
                </div>
                <div className={styles.aboutPillar}>
                  <div className={styles.aboutPillarIcon}>🗓️</div>
                  <div className={styles.aboutPillarTitle}>Tuesday Orders</div>
                  <div className={styles.aboutPillarText}>Fresh weekly batches every Tuesday for collection or delivery.</div>
                </div>
              </div>
            </div>
            <div className={styles.aboutVisual}>
              <div className={styles.aboutVisualCard} style={{ background: 'linear-gradient(145deg,#eaf4e8 0%,#f5f1ea 100%)' }}>
                <div className={styles.aboutVisualPattern} />
                <img src="/logo.png" alt="Root + Fuel" className={styles.aboutLogoLarge} />
                <p className={styles.aboutTagline}>&ldquo;Performance nutrition,<br />rooted in nature.&rdquo;</p>
                <div className={styles.aboutStats}>
                  <div className={styles.aboutStatItem}>
                    <span className={styles.aboutStatNum}>100%</span>
                    <span className={styles.aboutStatLabel}>Whole Food</span>
                  </div>
                  <div className={styles.aboutStatItem}>
                    <span className={styles.aboutStatNum}>Local</span>
                    <span className={styles.aboutStatLabel}>Sourced</span>
                  </div>
                  <div className={styles.aboutStatItem}>
                    <span className={styles.aboutStatNum}>Tue</span>
                    <span className={styles.aboutStatLabel}>Orders</span>
                  </div>
                </div>
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
                  />
                ))}
                {categoryItems.length === 0 && <p className={styles.empty}>Nothing here right now.</p>}
              </div>
            )}
          </main>
        </div>

        {/* Sticky order */}
        {cartCount > 0 && !mobileMenuOpen && (
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

        {showCart && <Cart cart={cart} onAdd={addToCart} onRemove={removeFromCart} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); setShowForm(true); }} />}
        {showForm && <OrderForm cart={cart} onClose={() => setShowForm(false)} />}

        {/* ── Footer ── paste this just before the closing </div> of the outer wrapper, after the showForm line */}

        <footer className={styles.footer}>
          <div className={styles.footerInner}>

            {/* Brand column */}
            <div className={styles.footerBrand}>
              <img src="/logo.png" alt="Root + Fuel" className={styles.footerLogo} />
              <p className={styles.footerTagline}>
                Performance nutrition, rooted in nature.
              </p>
              <p className={styles.footerLocation}>
                📍 Glasgow, Scotland
              </p>
            </div>

            {/* Menu links */}
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Menu</p>
              {availableCategories.map(cat => (
                <button
                  key={cat.name}
                  className={styles.footerLink}
                  onClick={() => switchCategory(cat.name)}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Info links */}
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Info</p>
              <button className={styles.footerLink} onClick={scrollToAbout}>About Us</button>
              <button className={styles.footerLink} onClick={scrollToMenu}>Order Online</button>
            </div>

            {/* Order info */}
            <div className={styles.footerCol}>
              <p className={styles.footerColTitle}>Ordering</p>
              <p className={styles.footerInfo}>
                🗓️ <strong>Tuesdays only</strong><br />
                Order by Monday midnight for Tuesday collection or delivery.
              </p>
            </div>

          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} Root + Fuel. All rights reserved.
            </p>
            <p className={styles.footerMade}>
              Whole food · Locally sourced · Glasgow
            </p>
          </div>
        </footer>


      </div>
    </>
  );
}