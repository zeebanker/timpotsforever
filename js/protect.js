/*
 * protect.js — Redirects to login.html if no active session
 * Include this on any page that requires authentication.
 */

(async function() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  }
})();
