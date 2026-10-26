
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"admin" | "user">("admin");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isUserLogin = mode === "user";
      const response = await fetch(
        isUserLogin ? "/api/auth/user-login" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isUserLogin
              ? { email: email.trim(), password: userPassword }
              : { password },
          ),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            F
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage your Formly forms and responses.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("admin");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "admin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Admin password
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("user");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "user"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Email login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "user" ? (
            <>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="userPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="userPassword"
                  name="userPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={1024}
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Enter your account password"
                />
              </div>
            </>
          ) : (
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                placeholder="Enter your admin password"
              />
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : mode === "user"
                ? "Sign in with email"
                : "Sign in as admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
