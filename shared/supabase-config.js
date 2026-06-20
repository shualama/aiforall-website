// AI for All — Supabase connection.
// Replace these two values with your Project URL and anon public key
// (Project Settings → API). The anon key is safe to expose publicly;
// data is protected by Row Level Security.
window.SUPABASE_URL = "REPLACE_WITH_PROJECT_URL";
window.SUPABASE_ANON_KEY = "REPLACE_WITH_ANON_KEY";

// True once real values are filled in — used by pages to decide whether to
// load live data from Supabase or fall back to the bundled static content.
window.SUPABASE_READY =
  window.SUPABASE_URL.indexOf("http") === 0 &&
  window.SUPABASE_ANON_KEY.length > 20;
