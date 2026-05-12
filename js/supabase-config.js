/*
 * Supabase Configuration
 * ─────────────────────
 * Replace the two values below with your own from:
 *   https://supabase.com → Your Project → Settings → API
 *
 * SUPABASE_URL   = the "Project URL"
 * SUPABASE_ANON  = the "anon / public" key (NOT the service_role key)
 */

const SUPABASE_URL  = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON = 'YOUR-ANON-KEY-HERE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
