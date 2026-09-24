/* ==========================================================================
   AES Staff Area — authentication, session and lockout.
   Layers with the Apache .htaccess/.htpasswd protection in /admin/.
   ========================================================================== */

(function () {
  'use strict';

  var LOCK_KEY = 'aesAdminLock';
  var SESSION_KEY = 'aesAdminSession';
  var cfg = (window.AES && window.AES.admin) || {};

  function readLS(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function readSS(key) {
    try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function writeSS(key, val) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function clearSS(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  function randomToken() {
    var arr = new Uint8Array(24);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function lockState() {
    var s = readLS(LOCK_KEY);
    var now = Date.now();
    if (s && s.u && s.u > now) return { locked: true, remainingMs: s.u - now, count: s.c || 0, until: s.u };
    return { locked: false, count: s ? s.c || 0 : 0, until: 0 };
  }

  function registerFailure() {
    var st = lockState();
    var count = (st.locked ? st.count : st.count) + 1;
    var until = 0;
    if (count >= (cfg.maxAttempts || 5)) {
      until = Date.now() + (cfg.lockoutMinutes || 15) * 60000;
    }
    writeLS(LOCK_KEY, { c: count, u: until });
    return { locked: !!until, count: count, untilMs: until ? until - Date.now() : 0 };
  }

  function clearFailures() {
    writeLS(LOCK_KEY, { c: 0, u: 0 });
  }

  function delayMs() {
    var st = lockState();
    return (cfg.minDelayMs || 350) + (st.count || 0) * 150;
  }

  function session() {
    var s = readSS(SESSION_KEY);
    var now = Date.now();
    if (!s || !s.t || !s.e || s.e <= now) {
      clearSS(SESSION_KEY);
      return null;
    }
    /* Sliding expiry: each valid check extends the session. */
    s.e = now + (cfg.sessionMinutes || 480) * 60000;
    writeSS(SESSION_KEY, s);
    return { user: s.u || cfg.username || 'Admin', expiresAt: s.e, msLeft: s.e - now };
  }

  window.AESAuth = {
    status: function () {
      var st = lockState();
      if (st.locked) return { state: 'locked', remainingMs: st.remainingMs };
      if (session()) return { state: 'ok' };
      return { state: 'anon' };
    },

    requireSession: function () {
      var st = lockState();
      if (st.locked) return { ok: false, reason: 'locked' };
      var s = session();
      if (!s) return { ok: false, reason: 'anon' };
      return { ok: true, session: s };
    },

    login: function (username, password) {
      var self = this;
      return new Promise(function (resolve) {
        var st = lockState();
        if (st.locked) {
          resolve({ ok: false, message: 'Too many failed attempts. Please wait and try again.' });
          return;
        }
        if (!username || !password || username.length > 64 || password.length > 128) {
          resolve({ ok: false, message: 'Enter your username and password.' });
          return;
        }
        var start = Date.now();
        var okUser = String(username).trim() === String(cfg.username || 'Admin');
        var okPass = !!(window.bcrypt && okUser) && window.bcrypt.compareSync(password, cfg.bcryptHash);
        var wait = delayMs();
        setTimeout(function () {
          if (okPass) {
            clearFailures();
            writeSS(SESSION_KEY, {
              t: randomToken(),
              e: Date.now() + (cfg.sessionMinutes || 480) * 60000,
              u: String(username).trim()
            });
            resolve({ ok: true, message: 'Welcome.' });
          } else {
            var res = registerFailure();
            var msg = res.locked
              ? 'Too many failed attempts. Login is locked for a while.'
              : 'Incorrect username or password.';
            resolve({ ok: false, message: msg, attemptsLeft: res.locked ? 0 : (cfg.maxAttempts || 5) - res.count });
          }
        }, Math.max(wait - (Date.now() - start), 0));
      });
    },

    logout: function () {
      clearSS(SESSION_KEY);
    }
  };
})();