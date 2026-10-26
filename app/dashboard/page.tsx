
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/user-auth";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const adminAuthenticated = await isAdminAuthenticated();

  if (adminAuthenticated) {
    return <Dashboard />;
  }

  const profile = await getCurrentUserProfile();

  if (!profile || profile.status !== "active") {
    redirect("/login");
  }

  return <Dashboard />;
}
