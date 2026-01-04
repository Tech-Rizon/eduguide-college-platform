import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;

if (typeof window !== "undefined") {
	// Client-side: create the real Supabase client (requires NEXT_PUBLIC_* env vars during build)
	if (!supabaseUrl || !supabaseAnonKey) {
		console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
	}
	supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
} else {
	// Server-side stub to avoid build-time crashes when env vars are not set in CI
	supabase = {
		auth: {
			getUser: async () => ({ data: { user: null } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
			signUp: async () => ({ data: null, error: new Error("Supabase not available on server") }),
			signInWithPassword: async () => ({ data: null, error: new Error("Supabase not available on server") }),
			signOut: async () => ({ error: new Error("Supabase not available on server") }),
			updateUser: async () => ({ data: null, error: new Error("Supabase not available on server") }),
		},
		from: () => ({ select: async () => ({ data: null, error: new Error("Supabase not available on server") }) }),
	} as any;
}

export const supabase = supabase as any;
