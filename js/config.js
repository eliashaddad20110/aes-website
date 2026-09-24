/* ==========================================================================
   AES website — central configuration.
   Used by the public pages (js/main.js) and the Staff Area (admin/index.html).

   SECURITY NOTE (client-side layer)
   --------------------------------
   The login below is protected by a bcrypt hash embedded in this file. That
   stops casual/accidental access and is safe to ship. It is NOT a substitute
   for server-side protection: anyone with the source can, in theory, brute
   force the hash. For real protection, the bundled /admin/.htaccess +
   .htpasswd files guard the whole Staff Area at the web-server level on any
   Apache/cPanel host. Keep both layers.
   ========================================================================== */

window.AES = {
  version: '1.0.0',

  admin: {
    /* Client-side login (CDN / localhost fallback layer) */
    username: 'Admin',
    bcryptHash: '$2b$12$dMAROXkO7GKuyqe2wuj0g.ZNh5w5AIOzodQSjyIl5pBEkSA9kxPRu',
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