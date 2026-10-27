
import "server-only";

import { createClient } from "@supabase/supabase-js";

export type ManagedUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  created_at: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not retrieve users.");
  }

  return (data ?? []).map((user) => {
    if (
      (user.role !== "admin" && user.role !== "user") ||
      (user.status !== "active" && user.status !== "suspended")
    ) {
      throw new Error("A user record contains invalid account details.");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    };
  });
}

export async function setManagedUserStatus(
  id: string,
  status: "active" | "suspended",
): Promise<ManagedUser> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );

  if (!isUuid) {
    throw new Error("Invalid user ID.");
  }

  if (status !== "active" && status !== "suspended") {
    throw new Error("Invalid account status.");
  }

  const supabase = getAdminClient();

  const { data: target, error: lookupError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Could not verify the target account.");
  }

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.role !== "user") {
    throw new Error("Administrator accounts cannot be changed here.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("role", "user")
    .select("id, email, role, status, created_at")
    .single();

  if (error || !data) {
    throw new Error("Could not update the account status.");
  }

  return {
    id: data.id,
    email: data.email,
    role: "user",
    status,
    created_at: data.created_at,
  };
}
