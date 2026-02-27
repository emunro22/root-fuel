import styles from './Cart.module.css';

export default function Cart({ cart, onAdd, onRemove, onClose, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.header}>
          <h2 className={styles.title}>Your Order</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {cart.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌿</div>
            <p>Your order is empty</p>
            <p className={styles.emptySub}>Add items from the menu to get started</p>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {cart.map(item => (
                <div key={item.name} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemPrice}>£{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  <div className={styles.qty}>
                    <button onClick={() => onRemove(item)} className={styles.qBtn}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onAdd(item)} className={styles.qBtn}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.totalRow}>
                <span>Total</span>
                <span className={styles.totalAmt}>£{total.toFixed(2)}</span>
              </div>
              <button className={styles.checkoutBtn} onClick={onCheckout}>
                Proceed to Checkout
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}