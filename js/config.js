/* ==========================================================================
   AES website — central configuration.
   Used by the public pages (js/main.js) and the Staff Area (admin/index.html).

   SECURITY NOTE (client-side layer)
   --------------------------------
   This file is served publicly on static hosts (e.g. GitHub Pages). The
   bcrypt hash below is NOT a true access barrier there: anyone with the
   source can extract it and brute-force it offline, and the session check
   is browser-side. On GitHub Pages there is no server-side gate, so treat
   the Staff Area as unauthenticated-min-plus. Real protection requires
   hosting on Apache/cPanel where the bundled /admin/.htaccess + .htpasswd
   guard the whole Staff Area at the web-server level. Keep both layers and
   rotate this password whenever it may have been exposed.
   ========================================================================== */

window.AES = {
  version: '1.0.0',

  admin: {
    /* Client-side login (CDN / localhost fallback layer) */
    username: 'Admin',
    bcryptHash: '$2b$12$zHoHJW4xXmJximQtv7Gg5eRM8pzxB4HUFlUt4GkQfCv5UhZGbYMTi',
    sessionMinutes: 480,          /* idle timeout: 8 hours */
    maxAttempts: 5,               /* failed attempts before lockout */
    lockoutMinutes: 15,           /* lockout duration after max attempts */
    minDelayMs: 350               /* minimum time each login attempt takes */
  },

  contact: {
    /* Optional form backend. Leave "" to use the mailto: fallback.
       Sign up free at https://formspree.io (or web3forms.com) and paste the
       endpoint URL here, e.g. "https://formspree.io/f/abcdefgh". Messages
       will then be emailed to you AND appear in the Staff Area inbox. */
    endpoint: '',
    email: 'info@aeschool.org',
    subjectPrefix: 'AES website',
    phone: '+96227275572'
  },

  announcement: {
    /* Sticky bar shown at the very top of public pages when enabled.
       Provide one entry per language (en / ar / de). Set enabled=false to hide.
       Edit the text/href in the Staff Area -> Guide tab, then paste the
       generated snippet into this file and re-deploy. */
    enabled: false,
    en: { text: '', href: '' },
    ar: { text: '', href: '' },
    de: { text: '', href: '' }
  },

  /* Pages scanned by the Staff Area "Site Health" audit */
  auditPages: [
    'index.html',
    'about.html',
    'admission.html',
    'contact.html',
    'divisions.html',
    'gallery.html',
    'mission.html'
  ]
};