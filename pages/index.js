import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Cart from '../components/Cart';
import MenuItem from '../components/MenuItem';
import OrderForm from '../components/OrderForm';

const CATEGORIES = [
  { name: 'Starters', icon: '🥗' },
  { name: 'Mains', icon: '🍽️' },
  { name: 'Desserts', icon: '🍮' },
];

export default function Home() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Starters');
  const [showCart, setShowCart] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => { setMenu(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
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

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const switchCategory = (cat) => {
    setActiveCategory(cat);
    setMobileMenuOpen(false);
    setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <>
      <Head>
        <title>Root & Fuel — Order Online</title>
        <meta name="description" content="Performance nutrition, rooted in nature. Order online from Root & Fuel, Glasgow." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0f0a" />
      </Head>

      <div style={{background:"#0a0f0a",minHeight:"100vh"}}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerBg} />
        <div className={styles.headerInner}>
          <a className={styles.logo} href="/">
            <div className={styles.logoIcon}>🌿</div>
            <div>
              <span className={styles.logoName}>ROOT·FUEL</span>
              <span className={styles.logoSub}>Performance Nutrition</span>
            </div>
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
          <div className={styles.mobileMenu}>
            <div className={styles.mobileMenuInner}>
              {/* Categories */}
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

              {/* Cart summary or order CTA */}
              {cartCount > 0 ? (
                <div className={styles.mobileCartBar} onClick={() => { setShowCart(true); setMobileMenuOpen(false); }}>
                  <div className={styles.mobileCartBarLeft}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9e40" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <span className={styles.mobileCartBarLabel}>Your Order</span>
                    <span className={styles.mobileCartBarCount}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                  </div>
                  <span className={styles.mobileCartBarPrice}>£{cartTotal.toFixed(2)}</span>
                </div>
              ) : null}

              {cartCount > 0 && (
                <button className={styles.mobileOrderBtn} onClick={() => { setShowForm(true); setMobileMenuOpen(false); }}>
                  Checkout · £{cartTotal.toFixed(2)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroGrid} />
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
              <div className={styles.heroStatNum}>3</div>
              <div className={styles.heroStatLabel}>Order Types</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatNum}>100%</div>
              <div className={styles.heroStatLabel}>Whole Food</div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      <main id="menu" className={styles.menuSection}>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      {showCart && (
        <Cart cart={cart} onAdd={addToCart} onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowForm(true); }} />
      )}
      {showForm && <OrderForm cart={cart} onClose={() => setShowForm(false)} />}
      </div>
    </>
  );
}