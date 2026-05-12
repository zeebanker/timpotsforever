/*
 * Supabase Configuration
 * ─────────────────────
 * Replace the two values below with your own from:
 *   https://supabase.com → Your Project → Settings → API
 *
 * SUPABASE_URL   = the "Project URL"
 * SUPABASE_ANON  = the "anon / public" key (NOT the service_role key)
 */

const SUPABASE_URL  = 'https://gamyvktzqjkboldlcgns.supabase.co';
const SUPABASE_ANON = 'sb_publishable_UXwy1bYGlzMEd0rZAZUbCA_kNofLFuB';

// Note: this intentionally REPLACES window.supabase (the SDK's namespace)
// with the created client instance. Don't change to `const supabase = ...` —
// that collides with the SDK's global and throws a duplicate-variable error.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
