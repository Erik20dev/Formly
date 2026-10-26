
import "server-only";

import { isAdminAuthenticated } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/user-auth";

export type ApiActor =
  | { kind: "admin" }
  | { kind: "user"; userId: string };

export async function getApiActor(): Promise<ApiActor | null> {
  try {
    // Preserve the existing administrator password login.
    if (await isAdminAuthenticated()) {
      return { kind: "admin" };
    }

    // Otherwise, check for an active individual account.
    const profile = await getCurrentUserProfile();

    if (!profile || profile.status !== "active") {
      return null;
    }

    // Platform administrators can manage all forms.
    if (profile.role === "admin") {
      return { kind: "admin" };
    }

    return {
      kind: "user",
      userId: profile.id,
    };
  } catch {
    // Fail closed if authentication cannot be verified.
    return null;
  }
}
