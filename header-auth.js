/**
 * header-auth.js
 * Shared session utilities for pages.
 * - checkSession(): checks /api/session with credentials
 * - isAuthenticated(): returns boolean
 * - getCurrentUser(): returns user object or null
 * - logoutUser(): POST /api/logout and redirect to login
 */

const API = '/api';
let currentUser = null;
let _sessionChecked = false;

async function checkSession() {
  // If already checked, return quickly
  if (_sessionChecked) return currentUser;
  try {
    const res = await fetch(API + '/session', { credentials: 'include' });
    if (!res.ok) {
      _sessionChecked = true;
      currentUser = null;
      return null;
    }
    const data = await res.json();
    if (data && data.success && data.user) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }
  } catch (err) {
    console.warn('[header-auth] session check failed', err);
    currentUser = null;
  }
  _sessionChecked = true;
  updateAuthUI();
  return currentUser;
}

function isAuthenticated() {
  return !!currentUser;
}

function getCurrentUser() {
  return currentUser;
}

async function logoutUser() {
  try {
    const res = await fetch(API + '/logout', { method: 'POST', credentials: 'include' });
    try { localStorage.removeItem('hitaishi_user'); } catch(e){}
    // clear currentUser
    currentUser = null;
    _sessionChecked = true;
    // redirect to login
    window.location.href = 'login2.html';
  } catch (err) {
    console.error('[header-auth] logout error', err);
    window.location.href = 'login2.html';
  }
}

function updateAuthUI() {
  // Update any obvious header link if present
  try {
    const loginLink = document.querySelector('a[href="login2.html"]') || document.getElementById('topLoginLink');
    if (loginLink) {
      if (currentUser) {
        loginLink.innerText = currentUser.firstName || 'Profile';
        loginLink.href = 'userdashboard.html';
        loginLink.style.background = '#ff3366';
        loginLink.style.color = '#fff';
        loginLink.style.padding = '6px 12px';
        loginLink.style.borderRadius = '16px';
        loginLink.style.textDecoration = 'none';
      } else {
        loginLink.innerText = 'Login';
        loginLink.href = 'login2.html';
      }
    }
    // add logout button near nav if authenticated
    if (currentUser) {
      if (!document.getElementById('headerLogoutBtn')) {
        const nav = document.querySelector('nav') || document.body;
        const btn = document.createElement('a');
        btn.id = 'headerLogoutBtn';
        btn.href = 'javascript:void(0);';
        btn.innerText = 'Logout';
        btn.style.background = '#dc3545';
        btn.style.color = '#fff';
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '12px';
        btn.style.marginLeft = '8px';
        btn.style.textDecoration = 'none';
        btn.onclick = logoutUser;
        nav.appendChild(btn);
      }
    } else {
      const existing = document.getElementById('headerLogoutBtn');
      if (existing) existing.remove();
    }
  } catch (err) {
    // non-fatal
  }
}

// auto-check on load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    checkSession();
  });
}

// expose to global
window.headerAuth = {
  checkSession,
  isAuthenticated,
  getCurrentUser,
  logoutUser
};

// also expose shortcuts for pages that expect global functions
window.checkSession = checkSession;
window.isAuthenticated = () => !!headerAuth.getCurrentUser();
window.getCurrentUser = () => headerAuth.getCurrentUser();
window.logoutUser = logoutUser;
