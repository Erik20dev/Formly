
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return <Dashboard />;
}

