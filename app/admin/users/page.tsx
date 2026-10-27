
import { redirect } from "next/navigation";
import { getApiActor } from "@/lib/api-auth";
import AdminUsers from "@/components/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await getApiActor();

  if (!actor || actor.kind !== "admin") {
    redirect("/dashboard");
  }

  return <AdminUsers />;
}
