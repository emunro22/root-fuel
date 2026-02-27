import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SuccessPage() {
  const router = useRouter();
  const { order_id, session_id } = router.query;
  const [confirmed, setConfirmed] = useState(false);

  // On success page load, mark order as paid via a direct API call
  useEffect(() => {
    if (session_id && order_id && !confirmed) {
      fetch('/api/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session_id, orderId: order_id }),
      }).then(() => setConfirmed(true)).catch(() => setConfirmed(true));
    }
  }, [session_id, order_id]);

  return (
    <>
      <Head>
        <title>Order Confirmed — Root & Fuel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#0a0f0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          animation: 'fadeUp 0.6s ease both',
        }}>
          {/* Animated checkmark */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d6a27, #4a9e40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 0 60px rgba(74,158,64,0.4)',
            fontSize: '32px',
          }}>✓</div>

          <div style={{ color: '#4a9e40', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
            Payment Successful
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(36px, 8vw, 52px)',
            fontWeight: 300,
            color: '#f0ede8',
            lineHeight: 1.1,
            marginBottom: '16px',
          }}>
            Your order<br />is confirmed
          </h1>
          <p style={{ color: '#8a9e87', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
            We've received your order and sent a confirmation to your email.
          </p>

          {order_id && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '32px',
            }}>
              <div style={{ color: '#8a9e87', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Order Reference</div>
              <div style={{ color: '#f0ede8', fontSize: '24px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '3px' }}>{order_id}</div>
            </div>
          )}

          <div style={{
            background: 'rgba(74,158,64,0.08)',
            border: '1px solid rgba(74,158,64,0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '20px' }}>🌿</span>
            <span style={{ color: '#8a9e87', fontSize: '14px', lineHeight: 1.5 }}>
              Performance nutrition, rooted in nature. Enjoy your meal!
            </span>
          </div>

          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #2d6a27, #4a9e40)',
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '100px',
            fontWeight: 600,
            fontSize: '15px',
            transition: 'opacity 0.2s',
          }}>
            ← Order Again
          </Link>
        </div>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}