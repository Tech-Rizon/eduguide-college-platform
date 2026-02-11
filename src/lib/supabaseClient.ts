import { createClient } from "@supabase/supabase-js";
 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 
let _supabase: any;
 
// Stub used when Supabase env vars are missing (CI builds, server-side rendering)
const createStub = () => ({
	auth: {
		getUser: async () => ({ data: { user: null } }),
		getSession: async () => ({ data: { session: null } }),
		onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
		signUp: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
		signInWithPassword: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
		signOut: async () => ({ error: new Error("Supabase environment variables not configured") }),
		updateUser: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
		resetPasswordForEmail: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
	},
	from: () => ({ select: async () => ({ data: null, error: new Error("Supabase not available") }) }),
} as any);
 
if (typeof window !== "undefined") {
	// Client-side: create the real Supabase client (requires NEXT_PUBLIC_* env vars during build)
	if (!supabaseUrl || !supabaseAnonKey) {
		console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
		// Create a stub to prevent crashes if env vars are missing
		_supabase = {
			auth: {
				getUser: async () => ({ data: { user: null } }),
				onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
				signUp: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
				signInWithPassword: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
				signOut: async () => ({ error: new Error("Supabase environment variables not configured") }),
				updateUser: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
			},
			from: () => ({ select: async () => ({ data: null, error: new Error("Supabase not available") }) }),
		} as any;
		_supabase = createStub();
	} else {
		_supabase = createClient(supabaseUrl, supabaseAnonKey);
	}
} else {
	// Server-side stub to avoid build-time crashes when env vars are not set in CI
	_supabase = {
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
	_supabase = createStub();
}
 
export const supabase = _supabase as any;
			signOut: async () => ({ error: new Error("Supabase not available on server") }),
			updateUser: async () => ({ data: null, error: new Error("Supabase not available on server") }),
		},
		from: () => ({ select: async () => ({ data: null, error: new Error("Supabase not available on server") }) }),
	} as any;
}
export const supabase = _supabase as any;