import { SupabaseClient } from '@supabase/supabase-js';
export declare const supabaseAdmin: SupabaseClient;
export declare const supabasePublic: SupabaseClient;
export declare function createUserClient(accessToken: string): SupabaseClient;
export declare function presentProfile<T extends {
    avatar_url?: string | null;
}>(profile: T): Promise<T>;
//# sourceMappingURL=supabase.d.ts.map