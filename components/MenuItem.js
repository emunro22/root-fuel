import { useState } from 'react';
import styles from './MenuItem.module.css';

export default function MenuItem({ item, quantity, onAdd, onRemove, delay }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`${styles.card} ${quantity > 0 ? styles.cardHasItem : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.imageWrap}>
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder}>🌿</div>
        )}
      </div>

      <div className={styles.cardBody}>
        <span className={styles.category}>{item.category}</span>
        <h3 className={styles.name}>{item.name}</h3>
        <p className={styles.desc}>{item.description}</p>
        <div className={styles.footer}>
          <span className={styles.price}>£{item.price.toFixed(2)}</span>
          <div className={styles.controls}>
            {quantity > 0 ? (
              <>
                <button className={styles.qtyBtn} onClick={onRemove} aria-label="Remove one">−</button>
                <span className={styles.qty}>{quantity}</span>
                <button className={styles.qtyBtn} onClick={onAdd} aria-label="Add one">+</button>
              </>
            ) : (
              <button className={styles.addBtn} onClick={onAdd}>Add</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}