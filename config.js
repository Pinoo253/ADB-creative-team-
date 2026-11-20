// Supabase project configuration.
// Publishable key aman digunakan di browser jika RLS sudah benar.
// JANGAN pernah menaruh service_role / secret key di file frontend.
window.ADB_CONFIG = {
  SUPABASE_URL: "https://kgyhwhnpldlcdfhwzkto.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_YcAKPKHsvz58Qm-3C6UlSw_uUKY9xAF"
};
// Aman kalau URL tidak sengaja ditulis dengan /rest/v1/ di belakangnya.
window.ADB_CONFIG.SUPABASE_URL = window.ADB_CONFIG.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
