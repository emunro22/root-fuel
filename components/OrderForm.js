import { useState } from 'react';
import styles from './OrderForm.module.css';

const ORDER_TYPES = [
  { id: 'pickup',   label: 'Collection',  icon: '🛍️' },
  { id: 'delivery', label: 'Delivery',    icon: '🚴' },
];

const COLLECTION_SLOTS = ['13:00', '16:00', '17:00'];

// Origin: All Tots Nursery, 64 Cowdenhill Rd, Glasgow G13 2HE
const ORIGIN_LAT = 55.8821;
const ORIGIN_LNG = -4.3714;
const MAX_MILES  = 10;

// Distance-based delivery pricing
// ≤ 3 miles  → £3.00 (local: Knightswood, Drumchapel, Yoker etc.)
// 3–15 miles → £5.00 (Faifley, Milngavie, Old Kilpatrick, Bowling, Bishopton etc.)
function getDeliveryFee(miles) {
  if (miles <= 3) return 3.00;
  return 5.00;
}

function toRad(deg) { return deg * Math.PI / 180; }

function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address) {
  const res = await fetch(
    `/api/geocode?address=${encodeURIComponent(address)}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Address not found');
  }
  const data = await res.json();
  return { lat: data.lat, lng: data.lng };
}

// Basic check that an address looks complete enough:
// must contain at least one number, some text, and a UK postcode pattern
const UK_POSTCODE_REGEX = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i;
function isAddressSufficientlyDetailed(address) {
  const trimmed = address.trim();
  const hasNumber   = /\d/.test(trimmed);
  const hasText     = /[a-zA-Z]{3,}/.test(trimmed);
  const hasPostcode = UK_POSTCODE_REGEX.test(trimmed);
  return hasNumber && hasText && hasPostcode;
}

export default function OrderForm({ cart, onClose }) {
  const [orderType, setOrderType] = useState('pickup');
  const [form,      setForm]      = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Collection slot
  const [collectionSlot, setCollectionSlot] = useState('');

  // Address validation state
  const [addressChecking, setAddressChecking] = useState(false);
  const [addressValid,    setAddressValid]     = useState(null); // null | true | false
  const [addressError,    setAddressError]     = useState('');
  const [addressDistance, setAddressDistance]  = useState(null);
  const [deliveryFee,     setDeliveryFee]      = useState(null); // set after address check

  // Promo code state
  const [promoCode,    setPromoCode]    = useState('');
  const [promoResult,  setPromoResult]  = useState(null);
  const [promoError,   setPromoError]   = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const cartSubtotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const appliedFee    = orderType === 'delivery' && deliveryFee !== null ? deliveryFee : 0;
  const cartTotal     = cartSubtotal + appliedFee;

  const discountAmount = promoResult
    ? promoResult.discount.type === 'percent'
      ? cartSubtotal * (promoResult.discount.amount / 100)
      : Math.min(promoResult.discount.amount, cartSubtotal)
    : 0;
  const finalTotal = cartTotal - discountAmount;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAddressChange = (val) => {
    set('address', val);
    setAddressValid(null);
    setAddressError('');
    setAddressDistance(null);
    setDeliveryFee(null);
  };

  const checkDeliveryRadius = async () => {
    if (!form.address.trim()) {
      setAddressError('Please enter a delivery address first.');
      return;
    }
    if (!isAddressSufficientlyDetailed(form.address)) {
      setAddressError('Please enter a full address including street number, street name, and postcode (e.g. 12 Main Street, Glasgow, G13 2HE).');
      setAddressValid(false);
      return;
    }
    setAddressChecking(true);
    setAddressValid(null);
    setAddressError('');
    setAddressDistance(null);
    setDeliveryFee(null);
    try {
      const { lat, lng } = await geocodeAddress(form.address);
      const miles = haversineDistanceMiles(ORIGIN_LAT, ORIGIN_LNG, lat, lng);
      setAddressDistance(miles);
      if (miles <= MAX_MILES) {
        const fee = getDeliveryFee(miles);
        setDeliveryFee(fee);
        setAddressValid(true);
      } else {
        setAddressValid(false);
        setAddressError(`Sorry, your address is ${miles.toFixed(1)} miles away — delivery is only available within ${MAX_MILES} miles of Glasgow G13.`);
      }
    } catch {
      setAddressError('Could not verify address. Please check it and try again.');
      setAddressValid(false);
    } finally {
      setAddressChecking(false);
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoResult(null);
    setPromoLoading(true);
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || 'Invalid code');
      } else {
        setPromoResult(data);
      }
    } catch {
      setPromoError('Could not validate code. Try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const validate = () => {
    if (!form.name.trim())                                return 'Please enter your name';
    if (!form.email.trim() || !form.email.includes('@'))  return 'Please enter a valid email';
    if (!form.phone.trim())                               return 'Please enter your phone number';
    if (orderType === 'pickup') {
      if (!collectionSlot) return 'Please select a collection time slot';
    }
    if (orderType === 'delivery') {
      if (!form.address.trim()) return 'Please enter your delivery address';
      if (!isAddressSufficientlyDetailed(form.address))
        return 'Please enter a full address including street number, street name, and postcode';
      if (addressValid === null) return 'Please check your delivery address using the "Check" button';
      if (addressValid === false) return 'Your address is outside our delivery area (15 miles from Glasgow G13)';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: { name: form.name, email: form.email, phone: form.phone },
          orderType,
          table: '',
          address: form.address,
          notes: form.notes,
          collectionSlot: orderType === 'pickup' ? collectionSlot : null,
          promotionCodeId: promoResult?.promotionCodeId || null,
          deliveryFee: orderType === 'delivery' ? (deliveryFee || 0) : 0,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <h2 className={styles.title}>Complete Your Order</h2>
            <button className={styles.close} onClick={onClose}>✕</button>
          </div>
          <div className={styles.body}>

            {/* Order type */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>How would you like your order?</span>
              <div className={styles.typeGrid}>
                {ORDER_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.typeBtn} ${orderType === t.id ? styles.typeActive : ''}`}
                    onClick={() => {
                      setOrderType(t.id);
                      setAddressValid(null);
                      setAddressError('');
                      setAddressDistance(null);
                      setCollectionSlot('');
                    }}
                  >
                    <span className={styles.typeIcon}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              {orderType === 'delivery' && (
                <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#7a8f77', lineHeight: 1.5 }}>
                  Delivery available within 15 miles. <strong style={{ color: '#3d5239' }}>Local areas £3.00 · Further afield £5.00.</strong> Enter your full address below and click Check to confirm your fee.
                </p>
              )}
              {orderType === 'pickup' && (
                <div style={{
                  margin: '10px 0 0',
                  background: '#eaf4e8',
                  border: '1px solid rgba(45,107,39,0.2)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '16px', marginTop: '1px' }}>📍</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#2d6b27', marginBottom: '2px' }}>Collection Address</p>
                    <p style={{ fontSize: '13px', color: '#3d5239', lineHeight: 1.6 }}>
                      All Tots Nursery<br />64 Cowdenhill Road<br />Glasgow, G13 2HE
                    </p>
                    <p style={{ fontSize: '12px', color: '#7a8f77', marginTop: '4px' }}>
                      Ready for collection every Tuesday.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>

              {/* Collection slot picker */}
              {orderType === 'pickup' && (
                <div className={styles.section}>
                  <span className={styles.sectionLabel}>Collection Time Slot *</span>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#7a8f77', lineHeight: 1.5 }}>
                    Food is made to order — please do not arrive before your chosen slot.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {COLLECTION_SLOTS.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setCollectionSlot(slot)}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          borderRadius: '10px',
                          border: collectionSlot === slot
                            ? '2px solid #2d6b27'
                            : '2px solid #d4e6d0',
                          background: collectionSlot === slot ? '#2d6b27' : '#fff',
                          color: collectionSlot === slot ? '#fff' : '#3d5239',
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  {collectionSlot && (
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#2d6b27', fontWeight: 600 }}>
                      ✓ {collectionSlot} slot selected
                    </p>
                  )}
                </div>
              )}

              {/* Customer details */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your Details</span>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name *</label>
                    <input className={styles.input} type="text" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email *</label>
                    <input className={styles.input} type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone *</label>
                    <input className={styles.input} type="tel" placeholder="Your phone number" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  {orderType === 'delivery' && (
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                      <label className={styles.label}>Delivery Address *</label>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#7a8f77' }}>
                        Please include house number, street name, town/city, and postcode
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <textarea
                          className={`${styles.input} ${styles.textarea}`}
                          placeholder="e.g. 12 Main Street, Knightswood, Glasgow, G13 2AB"
                          value={form.address}
                          onChange={e => handleAddressChange(e.target.value)}
                          rows={3}
                          style={{
                            flex: 1,
                            borderColor: addressValid === true
                              ? '#2d6b27'
                              : addressValid === false
                              ? '#b41e1e'
                              : undefined,
                          }}
                        />
                        <button
                          type="button"
                          onClick={checkDeliveryRadius}
                          disabled={addressChecking || !form.address.trim()}
                          style={{
                            whiteSpace: 'nowrap',
                            padding: '10px 16px',
                            background: addressValid === true ? '#2d6b27' : '#1a2418',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: addressChecking || !form.address.trim() ? 'not-allowed' : 'pointer',
                            opacity: addressChecking || !form.address.trim() ? 0.6 : 1,
                            marginTop: '2px',
                            minWidth: '64px',
                          }}
                        >
                          {addressChecking ? '…' : addressValid === true ? '✓ OK' : 'Check'}
                        </button>
                      </div>
                      {addressError && (
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#b41e1e', lineHeight: 1.4 }}>
                          {addressError}
                        </p>
                      )}
                      {addressValid === true && addressDistance !== null && deliveryFee !== null && (
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#2d6b27', lineHeight: 1.4 }}>
                          ✓ Address confirmed — {addressDistance.toFixed(1)} miles away. Delivery fee: <strong>£{deliveryFee.toFixed(2)}</strong>
                        </p>
                      )}
                    </div>
                  )}
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className={styles.label}>Allergies / Notes</label>
                    <textarea className={`${styles.input} ${styles.textarea}`} placeholder="Allergies, dietary requirements, special requests..." value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Order Summary</span>
                <div className={styles.summary}>
                  {cart.map(item => (
                    <div key={item.name} className={styles.summaryRow}>
                      <span>{item.quantity}× {item.name}</span>
                      <span>£{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}

                  {/* Collection slot summary line */}
                  {orderType === 'pickup' && collectionSlot && (
                    <div className={styles.summaryRow} style={{ color: '#7a8f77' }}>
                      <span>Collection slot</span>
                      <span>{collectionSlot}</span>
                    </div>
                  )}

                  {/* Delivery fee line — only shown once address is checked */}
                  {orderType === 'delivery' && deliveryFee !== null && (
                    <div className={styles.summaryRow} style={{ color: '#7a8f77' }}>
                      <span>Delivery fee</span>
                      <span>£{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {orderType === 'delivery' && deliveryFee === null && (
                    <div className={styles.summaryRow} style={{ color: '#7a8f77', fontStyle: 'italic' }}>
                      <span>Delivery fee</span>
                      <span>Check address</span>
                    </div>
                  )}

                  {/* Discount */}
                  {discountAmount > 0 && (
                    <>
                      <div className={styles.summaryRow} style={{ color: '#7a8f77' }}>
                        <span>Subtotal</span>
                        <span>£{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className={styles.summaryRow} style={{ color: '#2d6b27', fontWeight: 600 }}>
                        <span>
                          Discount
                          {promoResult?.discount.type === 'percent'
                            ? ` (${promoResult.discount.amount}% off)`
                            : ''}
                        </span>
                        <span>−£{discountAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className={styles.summaryTotal}>
                    <span className={styles.summaryTotalLabel}>Total</span>
                    <span className={styles.summaryTotalAmt}>£{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Promo code */}
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Promo Code</span>
                <div className={styles.promoRow}>
                  <input
                    className={`${styles.input} ${styles.promoInput} ${promoResult ? styles.promoInputSuccess : ''} ${promoError ? styles.promoInputError : ''}`}
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={e => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoResult(null);
                      setPromoError('');
                    }}
                    disabled={!!promoResult}
                  />
                  {promoResult ? (
                    <button
                      type="button"
                      className={styles.promoRemoveBtn}
                      onClick={() => { setPromoResult(null); setPromoCode(''); setPromoError(''); }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.promoApplyBtn}
                      onClick={applyPromo}
                      disabled={!promoCode.trim() || promoLoading}
                    >
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoError && (
                  <p className={styles.promoError}>✗ {promoError}</p>
                )}
                {promoResult && (
                  <p className={styles.promoSuccess}>
                    ✓ Code applied —{' '}
                    {promoResult.discount.type === 'percent'
                      ? `${promoResult.discount.amount}% off`
                      : `£${promoResult.discount.amount.toFixed(2)} off`}
                  </p>
                )}
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <><span className={styles.spinner} /> Redirecting to payment…</>
                ) : (
                  <>Pay £{finalTotal.toFixed(2)} with Stripe
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
              <p className={styles.secure}>🔒 Secure payment powered by Stripe</p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}