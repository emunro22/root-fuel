// Central place for site-wide constants used in structured data, the
// sitemap, and canonical/OG URLs. Override the domain via
// NEXT_PUBLIC_SITE_URL if the production domain ever changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rootandfuelltd.com').replace(/\/$/, '');
export const SITE_NAME = 'Root & Fuel';
export const INSTAGRAM_URL = 'https://www.instagram.com/rootandfuel/';
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CfJgYo7FQ2-9EBM/review';

export const ADDRESS = {
  streetAddress: '64 Cowdenhill Road',
  addressLocality: 'Glasgow',
  postalCode: 'G13 2HE',
  addressCountry: 'GB',
};

export const ADDRESS_FULL = `${ADDRESS.streetAddress}, ${ADDRESS.addressLocality} ${ADDRESS.postalCode}`;

export const PHONE = '+447496171808';
export const PHONE_DISPLAY = '07496 171808';
export const CONTACT_EMAIL = 'samanthahamilton@rootandfuelltd.com';

// Registered company details, used on the Privacy Policy / Terms pages.
export const LEGAL_NAME = 'ROOT & FUEL LTD';
export const COMPANY_NUMBER = 'SC866605';
export const REGISTERED_ADDRESS = '47 Craggan Drive, Glasgow, Scotland, G14 0EN';

// Hand-picked Instagram posts featured on the homepage — update this list to
// swap which posts show up in the "Follow us" section.
export const FEATURED_INSTAGRAM_POSTS = [
  'https://www.instagram.com/p/DcR2kzQCsfU/',
  'https://www.instagram.com/p/DY9KT2viFHL/',
  'https://www.instagram.com/p/DcAxbPIDPq8/',
];
