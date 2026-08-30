import { Analytics } from '@vercel/analytics/next';
import CookieConsent from '../components/CookieConsent';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
      <CookieConsent />
    </>
  );
}

export default MyApp;
