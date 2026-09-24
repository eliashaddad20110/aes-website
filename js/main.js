(function () {
  'use strict';

  var cfg = (window.AES || {}).contact || {};
  var ann = (window.AES || {}).announcement || {};
  var LOG_KEY = 'aesContactLog';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Menu overlay ---------- */
  var navToggle = $('#navToggle');
  var menuOverlay = $('#menuOverlay');
  var menuClose = $('#menuClose');

  function setMenu(open) {
    if (!menuOverlay) return;
    menuOverlay.classList.toggle('is-open', open);
    if (navToggle) { navToggle.setAttribute('aria-expanded', String(open)); }
  }
  if (navToggle && menuOverlay) {
    navToggle.addEventListener('click', function () { setMenu(true); });
    if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });
    menuOverlay.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOverlay.classList.contains('is-open')) { setMenu(false); if (navToggle) navToggle.focus(); }
    });
  }

  /* ---------- Announcement bar ---------- */
  var annEl = null;

  function annForLang(lang) {
    var o = ann[lang];
    if (o && o.text) return { text: o.text, href: o.href || '' };
    if (ann.en && ann.en.text) return { text: ann.en.text, href: ann.en.href || '' };
    return { text: ann.text || '', href: ann.href || '' };
  }

  function renderAnnouncement() {
    var prev = null;
    try { prev = JSON.parse(localStorage.getItem('aesAnnouncePreview') || 'null'); } catch (e) {}
    var usePreview = !!(prev && prev.text);
    if (!usePreview && !ann.enabled) return;
    var lang = 'en';
    try { if (window.AES_I18N) lang = window.AES_I18N.lang(); } catch (e) {}
    var data = usePreview ? { text: prev.text, href: prev.href || '' } : annForLang(lang);
    if (!data.text) return;
    if (annEl && annEl.parentNode) annEl.parentNode.removeChild(annEl);
    var el = document.createElement('a');
    el.className = 'announcement-bar';
    el.textContent = data.text;
    if (data.href) el.setAttribute('href', data.href);
    el.setAttribute('role', 'banner');
    document.body.insertBefore(el, document.body.firstChild);
    annEl = el;
  }
  renderAnnouncement();
  document.addEventListener('aes:langchange', renderAnnouncement);

  /* ---------- Hero slider ---------- */
  function buildHeroSlider(scope) {
    var root = $(scope);
    if (!root) return;
    var slides = $$('.hero-slide', root);
    if (slides.length < 2) { slides.forEach(function (s) { s.classList.add('is-active'); }); return; }
    var dotsWrap = $('.hero-dots', root);
    var idx = 0, timer = null;
    root.classList.add('transition');
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === 0);
      if (dotsWrap) {
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Slide ' + (i + 1));
        if (i === 0) b.classList.add('is-active');
        b.addEventListener('click', function () { go(i); restart(); });
        dotsWrap.appendChild(b);
      }
    });
    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('is-active', j === idx); });
      if (dotsWrap) $$('button', dotsWrap).forEach(function (b, j) { b.classList.toggle('is-active', j === idx); });
    }
    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }
    function restart() { stop(); timer = setInterval(next, 6000); }
    function stop() { if (timer) clearInterval(timer); }
    var pBtn = $('.hero-prev', root), nBtn = $('.hero-next', root);
    if (pBtn) pBtn.addEventListener('click', function () { prev(); restart(); });
    if (nBtn) nBtn.addEventListener('click', function () { next(); restart(); });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', restart);
    restart();
  }

  /* ---------- Feature slider (auto-rotating) ---------- */
  function buildFeatureSlider(root) {
    if (!root) return;
    var slides = $$('.feature-slide', root);
    if (slides.length < 2) { slides.forEach(function (s) { s.classList.add('is-active'); }); return; }
    var thumbs = $('.f-thumbs', root);
    var idx = 0, timer = null;
    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('is-active', j === idx); });
      if (thumbs) $$('button', thumbs).forEach(function (b, j) { b.classList.toggle('is-active', j === idx); });
    }
    function next() { show(idx + 1); }
    function restart() { stop(); timer = setInterval(next, 5500); }
    function stop() { if (timer) clearInterval(timer); }
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === 0);
      if (thumbs) {
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Show image ' + (i + 1));
        if (i === 0) b.classList.add('is-active');
        b.addEventListener('click', function () { show(i); restart(); });
        thumbs.appendChild(b);
      }
    });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', restart);
    restart();
  }

  buildHeroSlider('.hero-slider');
  $$('[data-feature-slider]').forEach(buildFeatureSlider);

  /* ---------- Tabs ---------- */
  $$('[data-tabs]').forEach(function (wrap) {
    var buttons = $$('.tab-list button', wrap);
    var panes = $$('.tab-pane', wrap);
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        buttons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        panes.forEach(function (p) { p.classList.toggle('is-active', p.id === target); });
      });
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var gallery = $('#gallery');
  var lightbox = $('#lightbox');
  if (gallery && lightbox) {
    var items = $$('.gallery-item', gallery);
    var lbImg = $('.lb-img', lightbox);
    var lbCap = $('.lb-caption', lightbox);
    var idx = 0;
    function open(i) {
      if (!items.length) return;
      idx = (i + items.length) % items.length;
      var img = $('img', items[idx]);
      var cap = $('figcaption', items[idx]);
      lbImg.src = img.getAttribute('src');
      lbImg.alt = img.alt;
      lbCap.textContent = cap ? cap.textContent : img.alt;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); });
    $('.lb-close', lightbox).addEventListener('click', close);
    $('.lb-prev', lightbox).addEventListener('click', function (e) { e.stopPropagation(); open(idx - 1); });
    $('.lb-next', lightbox).addEventListener('click', function (e) { e.stopPropagation(); open(idx + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(idx - 1);
      if (e.key === 'ArrowRight') open(idx + 1);
    });
  }

  /* ---------- Contact form ---------- */
  var contactForm = $('#contactForm');
  if (contactForm) {
    var statusEl = $('#formStatus');

    function logMessage(entry) {
      try {
        var log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        log.push(entry);
        if (log.length > 500) log = log.slice(-500);
        localStorage.setItem(LOG_KEY, JSON.stringify(log));
      } catch (e) {}
    }

    function setStatus(msg, ok) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'form-status' + (ok === false ? ' is-error' : ok === true ? ' is-ok' : '');
      statusEl.hidden = false;
    }

    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

    function tr(key, vars) {
      try { if (window.AES_I18N && typeof window.AES_I18N.t === 'function') return window.AES_I18N.t(key, vars); } catch (e) {}
      return key;
    }

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var gotcha = $('#fGotcha', contactForm);
      if (gotcha && gotcha.value) {
        setStatus(tr('status_gotcha'), true);
        contactForm.reset();
        return;
      }
      var name = $('#fName', contactForm).value.trim();
      var email = $('#fEmail', contactForm).value.trim();
      var msg = $('#fMsg', contactForm).value.trim();
      if (!name) { setStatus(tr('status_need_name'), false); $('#fName', contactForm).focus(); return; }
      if (!isValidEmail(email)) { setStatus(tr('status_bad_email'), false); $('#fEmail', contactForm).focus(); return; }
      if (msg.length < 5) { setStatus(tr('status_msg_short'), false); $('#fMsg', contactForm).focus(); return; }
      if (msg.length > 5000) { setStatus(tr('status_msg_long'), false); return; }

      var btn = contactForm.querySelector('button[type="submit"]');
      var entry = {
        id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        ts: Date.now(),
        name: name,
        email: email,
        message: msg,
        page: location.pathname.split('/').pop() || 'index.html',
        status: 'queued'
      };

      var subject = (cfg.subjectPrefix || 'AES website') + ' enquiry from ' + name;
      var body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + msg;

      function openMailto() {
        window.location.href = 'mailto:' + (cfg.email || 'info@aeschool.org') +
          '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      }

      if (cfg.endpoint) {
        setStatus(tr('status_sending'), null);
        fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: name, email: email, message: msg, _subject: subject })
        }).then(function (r) {
          if (r.ok) {
            entry.status = 'sent via endpoint';
            logMessage(entry);
            setStatus(tr('status_sent', { name: name }), true);
            contactForm.reset();
          } else {
            entry.status = 'endpoint failed (mailto fallback)';
            logMessage(entry);
            openMailto();
            setStatus(tr('status_endpoint_fail'), false);
          }
        }).catch(function () {
          entry.status = 'offline (mailto fallback)';
          logMessage(entry);
          openMailto();
          setStatus(tr('status_offline'), false);
        });
      } else {
        entry.status = 'opened in email app';
        logMessage(entry);
        openMailto();
        setStatus(tr('status_opening'), null);
      }
    });
  }

  /* ---------- Footer year ---------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();