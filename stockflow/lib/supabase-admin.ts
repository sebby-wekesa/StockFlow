import { createClient } from "@supabase/supabase-js";

let adminInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (!adminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase Admin configuration:", {
        url: !!supabaseUrl,
        key: !!supabaseServiceKey
      });
      throw new Error("Supabase Admin client could not be initialized due to missing environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    }

    adminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return adminInstance;
};

// Export as a proxy to maintain backward compatibility
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseAdmin();
    return (client as any)[prop];
  }
});

// Server-side client for middleware and server components
export const supabaseServer = () => {
  return getSupabaseAdmin();
};