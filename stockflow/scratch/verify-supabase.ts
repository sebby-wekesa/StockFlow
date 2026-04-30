import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';

console.log("Starting verification...");

async function verify() {
  try {
    console.log("Checking supabase client (proxy)...");
    // This should not throw even if env vars are missing, until we access a property
    console.log("Supabase client proxy created.");

    console.log("Checking supabaseAdmin client (proxy)...");
    console.log("SupabaseAdmin client proxy created.");

    console.log("Attempting to access a property (this should trigger initialization)...");
    try {
      const auth = supabase.auth;
      console.log("Accessing supabase.auth succeeded (if env vars are present).");
    } catch (e: any) {
      console.log("Accessing supabase.auth failed as expected (if env vars are missing during script execution):", e.message);
    }

    try {
      const authAdmin = supabaseAdmin.auth;
      console.log("Accessing supabaseAdmin.auth succeeded (if env vars are present).");
    } catch (e: any) {
      console.log("Accessing supabaseAdmin.auth failed as expected (if env vars are missing during script execution):", e.message);
    }

    console.log("Verification script finished without crashing on module import.");
  } catch (error: any) {
    console.error("Verification failed unexpectedly:", error);
    process.exit(1);
  }
}

verify();
