
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "suspended";
};

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  const adminClient = createClient(url, serviceKey);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  if (
    (profile.role !== "admin" && profile.role !== "user") ||
    (profile.status !== "active" && profile.status !== "suspended")
  ) {
    return null;
  }

  return profile as UserProfile;
}

export async function isActiveUser(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.status === "active";
}

export async function isUserAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.status === "active" && profile.role === "admin";
}
