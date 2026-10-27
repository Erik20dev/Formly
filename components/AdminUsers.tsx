
"use client";

import { useCallback, useEffect, useState } from "react";

type ManagedUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  created_at: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load users.");
      }

      setUsers(result.users ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function changeStatus(user: ManagedUser) {
    const nextStatus =
      user.status === "active" ? "suspended" : "active";

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus === "suspended" ? "suspend" : "reactivate"
      } ${user.email}?`,
    );

    if (!confirmed) return;

    setUpdatingId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update the account.");
      }

      setMessage(
        `${user.email} has been ${
          nextStatus === "suspended" ? "suspended" : "reactivated"
        }.`,
      );

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the account.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <a
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </a>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          User management
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          View accounts and manage access for regular users.
          Administrator accounts cannot be changed here.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {users.length} {users.length === 1 ? "account" : "accounts"}
        </p>

        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh list"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[650px] divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Created
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading user accounts...
                </td>
              </tr>
            )}

            {!loading && users.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No user accounts found.
                </td>
              </tr>
            )}

            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="break-all px-4 py-3 font-medium">
                  {user.email}
                </td>

                <td className="px-4 py-3 capitalize">{user.role}</td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "—"}
                </td>

                <td className="px-4 py-3">
                  {user.role === "user" ? (
                    <button
                      type="button"
                      onClick={() => void changeStatus(user)}
                      disabled={updatingId !== null}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.status === "active"
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {updatingId === user.id
                        ? "Updating..."
                        : user.status === "active"
                          ? "Suspend"
                          : "Reactivate"}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Protected
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
