import { useEffect, useRef } from 'react';

// Loads Instagram's official embed script once, then re-processes any
// .instagram-media blockquotes on the page (including ones that mount
// after the script has already loaded).
function loadEmbedScript(onReady) {
  if (typeof window === 'undefined') return;
  if (window.instgrm) { onReady(); return; }

  const existing = document.getElementById('instagram-embed-script');
  if (existing) {
    existing.addEventListener('load', onReady, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = 'instagram-embed-script';
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  script.onload = onReady;
  document.body.appendChild(script);
}

export default function InstagramEmbed({ url }) {
  const ref = useRef(null);

  useEffect(() => {
    loadEmbedScript(() => {
      window.instgrm?.Embeds?.process();
    });
  }, [url]);

  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '16px',
          margin: 0,
          maxWidth: '400px',
          minWidth: '280px',
          width: '100%',
        }}
      />
    </div>
  );
}
