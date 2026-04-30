import { createClient } from "@supabase/supabase-js";

let adminInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (adminInstance) return adminInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  try {
    adminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return adminInstance;
  } catch (err) {
    console.error("Failed to create Supabase Admin client:", err);
    return null;
  }
};

// Export as a proxy to maintain backward compatibility
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    // Avoid triggering initialization for common inspection properties or symbols
    if (
      prop === 'toJSON' || 
      prop === 'constructor' || 
      prop === 'then' || 
      typeof prop === 'symbol' ||
      prop.toString().startsWith('$$typeof')
    ) {
      return undefined;
    }

    const client = getSupabaseAdmin();
    if (!client) {
      // Return a function/object that throws when used
      return new Proxy({} as any, {
        get() {
          throw new Error("Supabase Admin client failed to initialize. Please check your environment variables (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).");
        },
        apply() {
          throw new Error("Supabase Admin client failed to initialize. Please check your environment variables.");
        }
      });
    }
    return (client as any)[prop];
  }
});

// Server-side client for middleware and server components
export const supabaseServer = () => {
  return getSupabaseAdmin();
};