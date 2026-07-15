// AI for All — Supabase connection.
//
// SUPABASE_ANON_KEY holds the project's PUBLISHABLE key (sb_publishable_...),
// the modern replacement for the legacy anon JWT. It is PUBLIC BY DESIGN and
// safe to commit: it grants only what Row Level Security allows. The secret
// key (sb_secret_...) must NEVER appear here or anywhere in this repo.
window.SUPABASE_URL = "https://eaeetzikuoygbyihfphg.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_kX00PRU73YJZoWlW5MR1jQ_ecU8CJkV";

// True once real values are filled in — used by pages to decide whether to
// load live data from Supabase or fall back to the bundled static content.
window.SUPABASE_READY =
  window.SUPABASE_URL.indexOf("http") === 0 &&
  window.SUPABASE_ANON_KEY.length > 20;
