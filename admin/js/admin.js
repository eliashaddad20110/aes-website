/* ==========================================================================
   AES Staff Area — dashboard UI and perks.
   Requires: ../js/config.js, js/bcrypt.js (window.bcrypt), ../js/auth.js
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.AES || {};
  var auth = window.AESAuth;
  var LOG_KEY = 'aesContactLog';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function httpGet(url, timeoutMs) {
    return new Promise(function (resolve) {
      var t = setTimeout(function () { resolve({ ok: false, status: 0, timedOut: true }); }, timeoutMs || 10000);
      try {
        fetch(url, { credentials: 'same-origin', cache: 'no-store' })
          .then(function (r) { clearTimeout(t); resolve({ ok: r.ok, status: r.status }); })
          .catch(function () { clearTimeout(t); resolve({ ok: false, status: 0 }); });
      } catch (e) { clearTimeout(t); resolve({ ok: false, status: 0 }); }
    });
  }

  function readLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; }
  }
  function writeLog(items) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtCountdown(ms) {
    if (ms <= 0) return '0:00';
    var m = Math.floor(ms / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    return m + ':' + String(s).padStart(2, '0');
  }

  var main, topRight;

  /* ------------------------------------------------------------------ */
  /* Tabs and navigation                                                  */
  /* ------------------------------------------------------------------ */

  function navItem(id, label) {
    return '<button type="button" class="admin-tab" data-tab="' + id + '">' + esc(label) + '</button>';
  }

  function wireTabs() {
    var tabs = document.querySelectorAll('.admin-tab');
    Array.prototype.forEach.call(tabs, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (x) { x.classList.toggle('is-active', x === b); });
        var id = b.getAttribute('data-tab');
        panels[id]();
      });
    });
  }

  var panels = {
    overview: renderOverview,
    health: renderHealth,
    messages: renderMessages,
    security: renderSecurity,
    guide: renderGuide
  };

  /* ------------------------------------------------------------------ */
  /* Login view                                                           */
  /* ------------------------------------------------------------------ */

  function renderLogin() {
    main.innerHTML =
      '<div class="admin-login-wrap">' +
        '<div class="admin-card admin-login-card">' +
          '<p class="eyebrow">Restricted</p>' +
          '<h2>Staff login</h2>' +
          '<p class="admin-muted">This area is for authorised Arab Episcopal School staff only.</p>' +
          '<form id="loginForm" novalidate>' +
            '<div class="form-field"><label for="lUser">Username</label>' +
              '<input type="text" id="lUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
            '<div class="form-field"><label for="lPass">Password</label>' +
              '<input type="password" id="lPass" name="password" autocomplete="current-password" required></div>' +
            '<p class="login-error" id="loginError" role="alert" hidden></p>' +
            '<button class="btn btn-primary admin-btn-block" type="submit" id="loginBtn">Sign in</button>' +
            '<p class="admin-muted admin-note">Authentication layer active. Server-level protection applies when this site is hosted on Apache (see the Security tab).</p>' +
          '</form>' +
        '</div>' +
      '</div>';
    if (topRight) topRight.innerHTML = '';
    var form = $('#loginForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#loginBtn');
      btn.disabled = true;
      btn.textContent = 'Checking…';
      var u = $('#lUser').value;
      var p = $('#lPass').value;
      auth.login(u, p).then(function (res) {
        if (res.ok) {
          render(); /* logged in -> dashboard */
        } else {
          btn.disabled = false;
          btn.textContent = 'Sign in';
          $('#loginError').hidden = false;
          $('#loginError').textContent = res.message;
          $('#lPass').value = '';
          $('#lPass').focus();
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard shell                                                      */
  /* ------------------------------------------------------------------ */

  function render() {
    var st = auth.status();
    if (st.state === 'locked') {
      renderLocked(st.remainingMs);
      return;
    }
    var req = auth.requireSession();
    if (!req.ok) {
      renderLogin();
      return;
    }
    renderDashboard(req.session);
  }

  function renderLocked(ms) {
    main.innerHTML =
      '<div class="admin-login-wrap">' +
        '<div class="admin-card admin-login-card">' +
          '<p class="eyebrow">Locked</p>' +
          '<h2>Login temporarily blocked</h2>' +
          '<p class="admin-muted">Too many failed attempts. This device is locked for</p>' +
          '<p class="admin-lock-count" id="lockCount">' + fmtCountdown(ms) + '</p>' +
          '<p class="admin-muted">You can close this tab and try again later, or come back on another browser.</p>' +
        '</div>' +
      '</div>';
    if (topRight) topRight.innerHTML = '';
    var t = setInterval(function () {
      var st = auth.status();
      var el = $('#lockCount');
      if (st.state !== 'locked') { clearInterval(t); render(); return; }
      if (el) el.textContent = fmtCountdown(st.remainingMs);
    }, 1000);
  }

  function renderDashboard(session) {
    main.innerHTML =
      '<div class="container admin-dashboard">' +
        '<section class="admin-head">' +
          '<div>' +
            '<p class="eyebrow">Dashboard</p>' +
            '<h1>Welcome, ' + esc(session.user) + '</h1>' +
            '<p class="admin-muted" id="sessionNote">Session expires in ' + fmtCountdown(session.msLeft) + '.</p>' +
          '</div>' +
        '</section>' +
        '<nav class="admin-nav" aria-label="Dashboard sections">' +
          navItem('overview', 'Overview') +
          navItem('health', 'Site health') +
          navItem('messages', 'Messages') +
          navItem('security', 'Security') +
          navItem('guide', 'Guide &amp; settings') +
        '</nav>' +
        '<div class="admin-panel" id="adminPanel"></div>' +
      '</div>';

    if (topRight) {
      topRight.innerHTML =
        '<span class="admin-session-chip" id="sessionChip">Signed in as ' + esc(session.user) + '</span>' +
        '<button type="button" class="admin-logout" id="logoutBtn">Log out</button>';
      $('#logoutBtn').addEventListener('click', function () {
        auth.logout();
        render();
      });
    }

    var t = setInterval(function () {
      var s = auth.session();
      var note = $('#sessionNote');
      var chip = $('#sessionChip');
      if (!s) { clearInterval(t); render(); return; }
      if (note) note.textContent = 'Session expires in ' + fmtCountdown(s.msLeft) + '.';
      if (chip) chip.textContent = 'Signed in as ' + esc(session.user);
    }, 30000);

    wireTabs();
    var tab = document.querySelector('.admin-tab');
    if (tab) tab.classList.add('is-active');
    panels.overview();
  }

  /* ------------------------------------------------------------------ */
  /* Panel: Overview                                                      */
  /* ------------------------------------------------------------------ */

  function renderOverview() {
    var msgs = readLog();
    var st = auth.status();
    var s = st.state === 'ok' ? auth.session() : null;
    var html = '<div class="admin-card-grid">' +
      card('Session', '<div class="admin-big">' + (s ? fmtCountdown(s.msLeft) : '—') + '</div><p>until idle timeout. Activity resets it automatically.</p>') +
      card('Messages inbox', '<div class="admin-big">' + msgs.length + '</div><p>submissions stored on this device.' +
        (cfg.contact && cfg.contact.endpoint ? ' A live form endpoint is configured.' : ' No form endpoint configured yet.') + '</p>') +
      card('Server protection', '<div class="admin-big" id="ovProtect">checking…</div><p aria-live="polite">HTTP-level protection of /admin/.</p>') +
      card('Site health', '<div class="admin-big" id="ovHealth">not run</div><p>Audit every page for broken links and assets.</p>') +
    '</div>' +
    '<div class="admin-actions">' +
      '<a class="btn btn-ghost" href="../contact.html">Open contact page</a>' +
      '<a class="btn btn-ghost" href="../index.html">View public site</a>' +
      '<a class="btn btn-primary" href="../contact.html" data-test-msg>Send a test message</a>' +
    '</div>';

    var panel = $('#adminPanel');
    panel.innerHTML = html;

    $('#ovProtect').textContent = 'checking…';
    httpGet('./.htaccess').then(function (r) {
      var el = $('#ovProtect');
      if (r.status === 401 || r.status === 403) { el.textContent = 'Protected (Basic Auth)'; el.className = 'admin-big ok'; }
      else if (r.status === 404) { el.textContent = 'No server layer (CDN/static)'; el.className = 'admin-big warn'; }
      else if (r.status === 0) { el.textContent = 'Not served over HTTP'; el.className = 'admin-big warn'; }
      else { el.textContent = 'REVIEW: .htaccess readable'; el.className = 'admin-big bad'; }
    });

    var a = null;
    try { a = JSON.parse(localStorage.getItem('aesLastAudit') || 'null'); } catch (e) {}
    if (a && a.ranAt) {
      $('#ovHealth').textContent = a.issueCount === 0 ? 'All clear' : a.issueCount + ' issue(s)';
      $('#ovHealth').className = 'admin-big ' + (a.issueCount === 0 ? 'ok' : 'bad');
    }
  }

  function card(title, bodyHtml) {
    return '<div class="admin-card"><h3>' + esc(title) + '</h3>' + bodyHtml + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Panel: Site health (audit)                                           */
  /* ------------------------------------------------------------------ */

  function renderHealth() {
    var panel = $('#adminPanel');
    panel.innerHTML =
      '<div class="admin-card admin-intro">' +
        '<h3>Site health audit</h3>' +
        '<p class="admin-muted">Fetches every public page and verifies internal links, images, and essential SEO/`accessibility` metadata.</p>' +
        '<button type="button" class="btn btn-primary" id="runAudit">Run audit</button>' +
        '<p class="admin-muted" id="auditNote"></p>' +
      '</div>' +
      '<div id="auditResults"></div>';

    $('#runAudit').addEventListener('click', runAudit);
  }

  function runAudit() {
    var note = $('#auditNote');
    var resBox = $('#auditResults');
    if (note) note.textContent = 'Auditing ' + cfg.auditPages.length + ' pages…';
    if (resBox) resBox.innerHTML = '';

    var pages = cfg.auditPages || [];
    var out = { pages: [], issues: 0, ranAt: Date.now() };

    Promise.all(pages.map(function (p) {
      return auditPage(p).then(function (r) { out.pages.push(r); out.issues += r.issues.length; });
    })).then(function () {
      try { localStorage.setItem('aesLastAudit', JSON.stringify(out)); } catch (e) {}
      if (note) note.textContent = 'Done. ' + out.issues + ' issue(s) found across ' + pages.length + ' pages.';
      var html = '<div class="admin-card admin-audit-summary">' +
        '<h3>Summary</h3><p class="admin-muted">Ran ' + new Date(out.ranAt).toLocaleString() + '.</p>' +
        '<p class="audit-score ' + (out.issues === 0 ? 'ok' : 'bad') + '">' + (out.issues === 0 ? 'All checks passed' : out.issues + ' issue(s) to review') + '</p></div>';
      out.pages.forEach(function (pg) {
        html += '<div class="admin-card admin-audit-page">' +
          '<h3>' + esc(pg.url) + ' <span class="audit-chip ' + (pg.issues.length ? 'bad' : 'ok') + '">' + pg.issues.length + ' issue(s)</span></h3>';
        if (pg.info.length) {
          html += '<ul class="admin-check-list info">' + pg.info.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
        }
        if (pg.issues.length) {
          html += '<ul class="admin-check-list bad">' + pg.issues.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
        }
        html += '</div>';
      });
      resBox.innerHTML = html;
    }).catch(function () {
      if (note) note.textContent = 'Could not run the audit — it needs to be served over HTTP (deployed site or `python -m http.server`).';
    });
  }

  function auditPage(rel) {
    var info = [];
    var issues = [];
    return httpGet(rel, 15000).then(function (res) {
      if (res.status === 0) {
        issues.push('Page unreachable (open the site over HTTP/localhost to audit).');
        return { url: rel, info: info, issues: issues };
      }
      if (!res.ok) { issues.push('Page failed to load (HTTP ' + res.status + ').'); return { url: rel, info: info, issues: issues }; }
      return fetch(rel, { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var checks = [];

          var lang = doc.documentElement.getAttribute('lang');
          if (lang) info.push('lang="' + lang + '"'); else issues.push('Missing <html lang> attribute.');

          var title = doc.querySelector('title');
          if (title && title.textContent.trim()) {
            if (title.textContent.trim().length > 70) issues.push('Title is ' + title.textContent.trim().length + ' chars (keep under ~70).');
          } else issues.push('Missing <title>.');

          if (doc.querySelector('meta[name="description"]')) info.push('Meta description present.');
          else issues.push('Missing meta description.');

          if (doc.querySelector('meta[property="og:title"]')) info.push('Open Graph tags present.');
          else issues.push('Missing Open Graph tags.');

          var h1s = doc.querySelectorAll('h1');
          if (h1s.length === 1) info.push('Exactly one <h1>.');
          else issues.push(h1s.length + ' <h1> tags found (expect exactly 1).');

          var imgs = doc.querySelectorAll('img');
          Array.prototype.forEach.call(imgs, function (im) {
            if (!im.getAttribute('alt') && im.getAttribute('alt') !== '') issues.push('Image lacks alt text: ' + (im.getAttribute('src') || '?'));
          });

          var inline = doc.querySelectorAll('[style]');
          if (inline.length) issues.push(inline.length + ' inline style attribute(s) — remove them (fixes CSP and keeps the site fast).');

          var anchors = doc.querySelectorAll('a[href]');
          var links = {};
          Array.prototype.forEach.call(anchors, function (a) {
            var h = a.getAttribute('href');
            if (!h || h === '#' || h.charAt(0) === '#') return;
            links[h] = (links[h] || 0) + 1;
          });
          var checksArr = Object.keys(links).map(function (href) {
            if (href.indexOf('://') !== -1) {
              if (href.indexOf('http://') === 0) return issues.push('Non-HTTPS external link: ' + href);
              if (href.indexOf('mailto:') === 0) return;
              return; /* https external — assume fine */
            }
            var target = href.split('#')[0].split('?')[0];
            if (!target) return;
            return httpGet(target, 10000).then(function (r) {
              if (r.status === 0) return; /* cannot verify (file:// etc.) */
              if (!r.ok) issues.push('Broken internal link: ' + href);
            });
          });
          return Promise.all(checksArr).then(function () {
            info.push('Checked ' + Object.keys(links).length + ' unique link(s).');
            return { url: rel, info: info, issues: issues };
          });
        });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Panel: Messages inbox                                                */
  /* ------------------------------------------------------------------ */

  function renderMessages() {
    var msgs = readLog();
    var panel = $('#adminPanel');

    var html = '<div class="admin-card admin-intro">' +
      '<h3>Messages inbox</h3>' +
      '<p class="admin-muted">Messages submitted through the contact form, sent from this device/browser.' +
      (cfg.contact && cfg.contact.endpoint
        ? ' A live form endpoint is configured, so submissions are also emailed to the school.'
        : ' No form endpoint configured yet — see the Guide tab for a 2-minute free setup.') + '</p>' +
      '<div class="admin-actions">' +
        '<a class="btn btn-ghost" href="../contact.html">Send a test message</a>' +
        '<button type="button" class="btn btn-ghost" id="clearMsgs">Clear all messages</button>' +
      '</div></div>';

    if (!msgs.length) {
      html += '<div class="admin-card"><p class="admin-muted">No messages captured on this device yet. Use "Send a test message" to try the flow.</p></div>';
    } else {
      html += '<div id="msgList">' + msgs.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).map(function (m) {
        return '<div class="admin-card admin-msg">' +
          '<div class="admin-msg-meta"><strong>' + esc(m.name || 'Anonymous') + '</strong>' +
          ' &lt;' + esc(m.email || '?') + '&gt; &middot; ' + esc(fmtDate(m.ts)) +
          (m.page ? ' &middot; via ' + esc(m.page) : '') + ' &middot; ' + esc(m.status || 'sent') + '</div>' +
          '<p class="admin-msg-body">' + esc(m.message) + '</p>' +
          '<button type="button" class="admin-link" data-del="' + m.id + '">Delete</button>' +
          '</div>';
      }).join('') + '</div>';
    }

    panel.innerHTML = html;

    var clear = $('#clearMsgs');
    if (clear) clear.addEventListener('click', function () {
      if (confirm('Delete all messages stored on this device?')) { writeLog([]); renderMessages(); }
    });

    var del = panel.querySelectorAll('[data-del]');
    Array.prototype.forEach.call(del, function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        writeLog(readLog().filter(function (m) { return m.id !== id; }));
        renderMessages();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Panel: Security                                                      */
  /* ------------------------------------------------------------------ */

  function renderSecurity() {
    var panel = $('#adminPanel');
    var html =
      '<div class="admin-card admin-intro">' +
        '<h3>Security</h3>' +
        '<p class="admin-muted">Review the layers protecting this area and rotate the admin password safely.</p>' +
        '<p class="admin-muted" id="secProbe">Checking server protection…</p>' +
      '</div>' +
      '<div class="admin-card">' +
        '<h3>Rotate the admin password</h3>' +
        '<p class="admin-muted">Pick a strong password and generate both server formats in one click:</p>' +
        '<div class="form-field"><label for="secUser">Username</label>' +
          '<input type="text" id="secUser" value="Admin" autocapitalize="none" spellcheck="false"></div>' +
        '<div class="form-field"><label for="secPass">New password</label>' +
          '<input type="password" id="secPass" autocomplete="new-password"></div>' +
        '<p class="admin-muted" id="secStrength" aria-live="polite"></p>' +
        '<button type="button" class="btn btn-primary" id="genBtn">Generate</button>' +
        '<div id="secOutput"></div>' +
      '</div>';

    panel.innerHTML = html;

    httpGet('./.htaccess').then(function (r) {
      var el = $('#secProbe');
      if (r.status === 401 || r.status === 403) el.textContent = 'Server protection: active (HTTP Basic Auth).';
      else if (r.status === 404) el.textContent = 'Server protection: none detected (static CDN host) — the JS login layer is in effect.';
      else if (r.status === 0) el.textContent = 'Server protection: cannot check (not served over HTTP).';
      else el.textContent = 'Server protection: REVIEW — admin/.htaccess appears readable (HTTP ' + r.status + '). Protect it now.';
    });

    var pass = $('#secPass');
    pass.addEventListener('input', function () {
      var s = strength(pass.value);
      var el = $('#secStrength');
      el.textContent = 'Password strength: ' + s.label;
      el.className = 'admin-muted strength-' + s.k;
    });

    $('#genBtn').addEventListener('click', function () {
      var u = $('#secUser').value.trim();
      var p = $('#secPass').value;
      if (!u || !p) { $('#secOutput').innerHTML = '<p class="admin-muted badtext">Enter a username and password first.</p>'; return; }
      if (p.length < 12) { $('#secOutput').innerHTML = '<p class="admin-muted badtext">Use at least 12 characters for a real password.</p>'; return; }
      var hash = window.bcrypt.hashSync(p, 12).replace(/^\$2b\$/, '$2y$');
      $('#secOutput').innerHTML =
        '<div class="admin-code-block">' +
          '<h4>1. Apache (.htpasswd)</h4>' +
          '<textarea readonly rows="2" data-select>' + esc(u + ':' + hash) + '</textarea>' +
          '<p class="admin-muted">Replace the contents of <code>admin/.htpasswd</code> with this line.</p>' +
          '<h4>2. JS layer (config.js)</h4>' +
          '<textarea readonly rows="1" data-select>' + esc(u + ':$2b$' + hash.slice(4)) + '</textarea>' +
          '<p class="admin-muted">Set the same <code>username</code> and <code>bcryptHash</code> values in <code>js/config.js</code> (see the Guide tab).</p>' +
        '</div>';
      /* CSP blocks inline onclick, so select-on-focus via JS instead. */
      Array.prototype.forEach.call($('#secOutput').querySelectorAll('[data-select]'), function (ta) {
        ta.addEventListener('focus', function () { ta.select(); });
        ta.addEventListener('click', function () { ta.select(); });
      });
    });
  }

  function strength(p) {
    var score = 0;
    if (p.length >= 12) score++;
    if (p.length >= 16) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score >= 5) return { k: 'ok', label: 'strong' };
    if (score >= 3) return { k: 'mid', label: 'acceptable' };
    return { k: 'bad', label: 'weak' };
  }

  /* ------------------------------------------------------------------ */
  /* Panel: Guide & settings                                              */
  /* ------------------------------------------------------------------ */

  function renderGuide() {
    var panel = $('#adminPanel');
    var ann = cfg.announcement || {};
    panel.innerHTML =
      '<div class="admin-card">' +
        '<h3>How the Staff Area is protected</h3>' +
        '<ol class="admin-steps">' +
          '<li><strong>Server layer (Apache/cPanel):</strong> the <code>admin/.htaccess</code> file asks for credentials before anything in /admin/ loads. Password lives in <code>admin/.htpasswd</code> (bcrypt).</li>' +
          '<li><strong>JS layer (everywhere):</strong> <code>admin/index.html</code> also checks the bcrypt sign-in and watches for repeated failed attempts.</li>' +
        '</ol>' +
      '</div>' +
      '<div class="admin-card">' +
        '<h3>Receive contact-form messages by email</h3>' +
        '<p class="admin-muted">The contact form works with zero setup using a mailto fallback. To reliably receive <em>every</em> visitor message:</p>' +
        '<ol class="admin-steps">' +
          '<li>Sign up free at <a href="https://formspree.io" target="_blank" rel="noopener noreferrer">formspree.io</a> and create a form for <code>' + esc(cfg.contact.email || 'info@aeschool.org') + '</code>.</li>' +
          '<li>Copy the endpoint like <code>https://formspree.io/f/xxxx</code> into the <code>contact.endpoint</code> value in <code>js/config.js</code>.</li>' +
          '<li>Redeploy. Messages are then emailed to you and appear in this dashboard inbox.</li>' +
        '</ol>' +
      '</div>' +
      '<div class="admin-card">' +
        '<h3>Announcement banner</h3>' +
        '<p class="admin-muted">Shows a short notice across the top of public pages. Edit below, preview it, then paste the generated snippet into the <code>announcement</code> section of <code>js/config.js</code> and redeploy.</p>' +
        '<div class="form-field"><label for="annText">Announcement text (blank to disable)</label>' +
          '<input type="text" id="annText" maxlength="160" value="' + esc(ann.text || '') + '"></div>' +
        '<div class="form-field"><label for="annHref">Link URL (optional)</label>' +
          '<input type="text" id="annHref" value="' + esc(ann.href || '') + '"></div>' +
        '<div class="admin-actions">' +
          '<button type="button" class="btn btn-ghost" id="annPreview">Preview</button>' +
          '<button type="button" class="btn btn-primary" id="annSnippet">Copy config snippet</button>' +
        '</div>' +
        '<div id="annOut"></div>' +
      '</div>' +
      '<div class="admin-card">' +
        '<h3>Change the admin credentials</h3>' +
        '<p class="admin-muted">Open the <strong>Security</strong> tab to generate a new password. Then update both files:</p>' +
        '<ol class="admin-steps">' +
          '<li>Paste the generated line into <code>admin/.htpasswd</code> (server layer).</li>' +
          '<li>Update <code>username</code> and <code>bcryptHash</code> in <code>js/config.js</code> (JS layer).</li>' +
        '</ol>' +
        '<p class="admin-muted">Keep the same username across both layers is easiest.</p>' +
      '</div>';

    $('#annPreview').addEventListener('click', function () {
      var t = $('#annText').value.trim();
      var h = $('#annHref').value.trim();
      var html = '<p class="admin-muted">Preview:</p><a class="announcement-bar announcement-bar-static" ' + (h ? 'href="' + esc(h) + '"' : '') + '>' + esc(t || '(empty banner)') + '</a>';
      $('#annOut').innerHTML = html;
    });

    $('#annSnippet').addEventListener('click', function () {
      var t = $('#annText').value.trim();
      var h = $('#annHref').value.trim();
      var snippet = 'announcement: {\n  enabled: ' + (t ? 'true' : 'false') + ',\n  text: ' + JSON.stringify(t) + ',\n  href: ' + JSON.stringify(h) + '\n}';
      copyText(snippet, $('#annOut'));
    });
  }

  function copyText(text, outEl) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (outEl) outEl.innerHTML = '<pre class="admin-code">' + esc(text) + '</pre><p class="admin-muted">' + (ok ? 'Copied to clipboard. Paste into js/config.js.' : 'Select and copy the snippet above.') + '</p>';
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    main = $('#adminMain');
    topRight = $('#adminTopRight');
    render();
  });
})();