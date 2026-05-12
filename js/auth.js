/*
 * auth.js — Login, signup, logout, password reset + masthead UI sync
 * Uses the global `supabase` client from supabase-config.js
 */

// ── Form helpers (used by login.html) ────────────────────────

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError() {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function showSuccess(msg) {
  const el = document.getElementById('auth-success');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function handleLogin(e) {
  e.preventDefault();
  hideError();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showError('Please enter both email and password.'); return; }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { showError(error.message); }
  else       { window.location.href = 'members.html'; }
}

async function handleSignup(e) {
  e.preventDefault();
  hideError();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  if (!email || !password)   { showError('Please fill in all fields.'); return; }
  if (password.length < 6)   { showError('Password must be at least 6 characters.'); return; }
  if (password !== confirm)  { showError('Passwords do not match.'); return; }
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) { showError(error.message); }
  else       { showSuccess('Account created! Check your email to confirm, then log in.'); }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  hideError();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showError('Please enter your email address.'); return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/members.html'
  });
  if (error) { showError(error.message); }
  else       { showSuccess('Password reset link sent! Check your email.'); }
}

async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

function showTab(tabName) {
  document.querySelectorAll('.auth-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-' + tabName);
  const btn   = document.getElementById('tab-' + tabName);
  if (panel) panel.style.display = 'block';
  if (btn)   btn.classList.add('active');
  hideError();
  const s = document.getElementById('auth-success');
  if (s) s.style.display = 'none';
}

// ── Masthead + nav UI sync ───────────────────────────────────

const USER_ICON_SVG = `
  <svg class="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
  </svg>
`;

async function updateMastheadAuth() {
  const aff = document.getElementById('user-affordance');
  if (!aff) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    const email = session.user.email || '';
    const initial = (email[0] || '?').toUpperCase();
    aff.href = 'members.html';
    aff.setAttribute('aria-label', 'My account');
    aff.classList.add('signed-in');
    aff.innerHTML = `<span class="user-initial">${initial}</span><span class="user-label">My account</span>`;
  } else {
    aff.href = 'login.html';
    aff.setAttribute('aria-label', 'Sign in');
    aff.classList.remove('signed-in');
    aff.innerHTML = `${USER_ICON_SVG}<span class="user-label">Sign in</span>`;
  }
}

async function updateProtectedLocks() {
  const { data: { session } } = await supabase.auth.getSession();
  document.querySelectorAll('.protected-link').forEach(link => {
    link.classList.toggle('locked', !session);
  });
}

function refreshAuthUI() {
  updateMastheadAuth();
  updateProtectedLocks();
}

// Run when sections finish loading, and again on any auth state change.
document.addEventListener('sectionsLoaded', refreshAuthUI);
if (window.supabase && supabase.auth && supabase.auth.onAuthStateChange) {
  supabase.auth.onAuthStateChange(refreshAuthUI);
}
