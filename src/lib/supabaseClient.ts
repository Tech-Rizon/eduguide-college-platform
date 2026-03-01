import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type StubSupabase = Pick<SupabaseClient, "auth" | "from">;

const createStub = (): StubSupabase => ({
	auth: {
		getUser: async () => ({ data: { user: null }, error: null }),
		getSession: async () => ({ data: { session: null }, error: null }),
		onAuthStateChange: () => ({ data: { subscription: { id: "", callback: () => {}, unsubscribe: () => {} } }, error: null }),
		signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables not configured") }),
		signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables not configured") }),
		signOut: async () => ({ error: new Error("Supabase environment variables not configured") }),
		updateUser: async () => ({ data: { user: null }, error: new Error("Supabase environment variables not configured") }),
		resetPasswordForEmail: async () => ({ data: {}, error: new Error("Supabase environment variables not configured") }),
		mfa: {
			listFactors: async () => ({ data: { all: [], totp: [], phone: [] }, error: new Error("Supabase environment variables not configured") }),
			enroll: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
			challenge: async () => ({ data: null, error: new Error("Supabase environment variables not configured") }),
			verify: async () => ({ data: null, session: null, error: new Error("Supabase environment variables not configured") }),
		},
	} as unknown as SupabaseClient["auth"],
	from: () => {
		throw new Error("Supabase not available");
	},
});

function buildClient(): SupabaseClient | StubSupabase {
	if (typeof window === "undefined") return createStub();
	if (!supabaseUrl || !supabaseAnonKey) {
		console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
		return createStub();
	}
	return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = buildClient() as SupabaseClient;
