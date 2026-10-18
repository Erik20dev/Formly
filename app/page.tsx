
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-bold">
          Formly
        </Link>

        <Link
          href="/login"
          className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold hover:bg-indigo-400"
        >
          Admin Login
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-5 font-semibold text-indigo-400">
          INTERACTIVE FORM BUILDER
        </p>

        <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
          Create forms.
          <br />
          Collect responses.
          <br />
          <span className="text-indigo-400">Keep it simple.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Build interactive forms, guide visitors one question at a time,
          and manage every response from one dashboard.
        </p>

        <Link
          href="/dashboard"
          className="mt-9 inline-block rounded-xl bg-indigo-500 px-7 py-4 font-semibold hover:bg-indigo-400"
        >
          Open Dashboard →
        </Link>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            title: "Build your forms",
            description:
              "Create questions, customize colors, and preview your forms.",
          },
          {
            title: "Chat-style experience",
            description:
              "Ask visitors one question at a time with helpful validation.",
          },
          {
            title: "Track responses",
            description:
              "Publish forms and view submitted answers in your dashboard.",
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
          >
            <h2 className="text-xl font-semibold">{feature.title}</h2>
            <p className="mt-3 text-slate-300">
              {feature.description}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-400">
        © {new Date().getFullYear()} Formly — Interactive Form Builder
      </footer>
    </main>
  );
}
