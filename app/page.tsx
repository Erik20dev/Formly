import Link from "next/link";

const features = [
  ["01", "Visual form builder", "Create forms with text, email, multiple-choice and yes/no questions."],
  ["02", "Conversational widget", "Ask one question at a time in a friendly, floating chat experience."],
  ["03", "Response dashboard", "Review submissions and timestamps from one organized workspace."]
];

export default function Home() {
  return <main>
    <nav className="shell flex items-center justify-between py-6">
      <Link href="/" className="text-2xl font-black tracking-tight"><span className="text-indigo-600">●</span> formly</Link>
      <div className="flex items-center gap-5 text-sm font-semibold"><a href="#features" className="hidden sm:block">Features</a><Link href="/dashboard" className="btn btn-primary">Open dashboard ↗</Link></div>
    </nav>
    <section className="shell grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
      <div>
        <div className="mb-5 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">Forms that feel like a conversation</div>
        <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight sm:text-6xl">Better questions.<br/><span className="text-indigo-600">Better answers.</span></h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Build interactive forms, share a public link or embed a chatbot on your website, then manage every response in one place.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard" className="btn btn-primary">Start building <span>→</span></Link><a href="#how-it-works" className="btn btn-light">See how it works</a></div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-500"><span>✓ No-code form setup</span><span>✓ Mobile friendly</span><span>✓ Response tracking</span></div>
      </div>
      <div className="panel relative overflow-hidden bg-gradient-to-br from-white to-indigo-50 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">LIVE PREVIEW</p><h2 className="text-xl font-bold">Quick feedback</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">● Online</span></div>
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 p-4 text-sm">Hey there! What would you like to share feedback about?</div>
          <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-indigo-600 p-4 text-sm text-white">My recent experience</div>
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 p-4 text-sm">Great. How would you rate it?</div>
          <div className="flex flex-wrap gap-2"><span className="rounded-full border px-4 py-2 text-sm">⭐ Good</span><span className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">🌟 Excellent</span></div>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl border bg-white p-3 text-sm text-slate-400"><span>Type your answer…</span><span className="ml-auto rounded-lg bg-indigo-600 px-3 py-2 text-white">↑</span></div>
      </div>
    </section>
    <section id="features" className="bg-white py-16"><div className="shell"><p className="text-sm font-bold uppercase tracking-[.2em] text-indigo-600">Everything you need</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">From first question to final response.</h2><div className="mt-9 grid gap-5 md:grid-cols-3">{features.map(([n,title,description])=><article className="panel p-6" key={n}><span className="text-sm font-black text-indigo-600">{n}</span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div></div></section>
    <section id="how-it-works" className="shell py-16"><div className="panel grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12"><div><p className="font-bold text-indigo-600">HOW IT WORKS</p><h2 className="mt-2 text-3xl font-black">Create. Publish. Learn.</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">Build your questions, publish a shareable form link, embed the floating chat widget on a test site, and see saved submissions in your dashboard.</p></div><Link href="/dashboard" className="btn btn-primary">Create your first form →</Link></div></section>
    <footer className="border-t bg-white py-7 text-center text-sm text-slate-500">© {new Date().getFullYear()} Formly. Simple forms, meaningful feedback.</footer>
  </main>;
}
