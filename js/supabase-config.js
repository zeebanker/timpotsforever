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

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
