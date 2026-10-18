"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormRecord, Submission } from "@/lib/types";

const emptyForm = (): FormRecord => ({
  id: crypto.randomUUID(), title: "Untitled form", description: "", published: false,
  welcomeText: "Hi! Let's get started.", completionText: "Thanks for your response!",
  accentColor: "#4f46e5", questions: [{ id: crypto.randomUUID(), label: "What would you like to tell us?", type: "text", required: true }],
  createdAt: new Date().toISOString()
});

export default function Dashboard() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"forms"|"responses">("forms");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const appUrl = typeof window === "undefined" ? "" : window.location.origin;

  async function refresh() {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([fetch("/api/forms"), fetch("/api/submissions")]);
      if (!f.ok || !s.ok) throw new Error("Could not load dashboard data.");
      setForms(await f.json()); setSubmissions(await s.json());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Loading failed."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function save() {
    if (!editing?.title.trim()) { setMessage("Please enter a form title."); return; }
    if (!editing.questions.length) { setMessage("Add at least one question before saving."); return; }
    if (editing.questions.some(q => !q.label.trim())) { setMessage("Every question needs a label."); return; }
    const response = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not save form."); return; }
    setEditing(null); setMessage("Form saved successfully."); await refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this form and its saved responses?")) return;
    const response = await fetch(`/api/forms/${id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Could not delete form."); return; }
    await refresh();
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setMessage("Copied to clipboard."); }
    catch { setMessage(text); }
  }
  function updateQuestion(index: number, patch: Partial<FormRecord["questions"][number]>) {
    if (!editing) return;
    setEditing({ ...editing, questions: editing.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
  }

  return <main className="min-h-screen pb-12">
    <header className="border-b bg-white"><div className="shell flex items-center justify-between py-5"><Link href="/" className="text-2xl font-black"><span className="text-indigo-600">●</span> formly</Link><Link href="/" className="text-sm font-semibold text-slate-600">← Back to website</Link></div></header>
    <div className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Workspace</p><h1 className="mt-2 text-3xl font-black">Dashboard</h1><p className="mt-2 text-slate-500">Create forms, publish them and manage responses.</p></div><button className="btn btn-primary" onClick={()=>{setEditing(emptyForm());setMessage("");}}>＋ Create form</button></div>
      {message && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}
      <div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat label="Total forms" value={forms.length}/><Stat label="Published forms" value={forms.filter(f=>f.published).length}/><Stat label="Total responses" value={submissions.length}/></div>
      <div className="mt-8 flex gap-2 border-b"><button onClick={()=>setActiveTab("forms")} className={`px-4 py-3 text-sm font-bold ${activeTab==="forms"?"border-b-2 border-indigo-600 text-indigo-700":"text-slate-500"}`}>My forms</button><button onClick={()=>setActiveTab("responses")} className={`px-4 py-3 text-sm font-bold ${activeTab==="responses"?"border-b-2 border-indigo-600 text-indigo-700":"text-slate-500"}`}>Submissions ({submissions.length})</button></div>
      {loading ? <p className="py-12 text-slate-500">Loading workspace…</p> : activeTab==="forms" ? <div className="mt-5 grid gap-4 md:grid-cols-2">{forms.map(form=><article className="panel p-5" key={form.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{form.title}</h2><p className="mt-1 text-sm text-slate-500">{form.questions.length} questions · {submissions.filter(s=>s.formId===form.id).length} responses</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${form.published?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{form.published?"Published":"Draft"}</span></div><p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600">{form.description || "No description added yet."}</p><div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-light text-sm" onClick={()=>setEditing({...form,questions:form.questions.map(q=>({...q}))})}>Edit</button><button className="btn btn-light text-sm" onClick={()=>copy(`${appUrl}/forms/${form.id}`)}>Copy public link</button><button className="btn btn-light text-sm" onClick={()=>copy(`<script src="${appUrl}/widget.js" data-form-id="${form.id}" defer></script>`)}>Copy embed code</button><button className="btn btn-light text-sm text-rose-600" onClick={()=>void remove(form.id)}>Delete</button></div>{form.published&&<Link className="mt-4 inline-block text-sm font-bold text-indigo-700" href={`/forms/${form.id}`}>Open public form ↗</Link>}</article>)}{forms.length===0&&<div className="panel col-span-full p-10 text-center"><div className="text-4xl">✦</div><h2 className="mt-3 text-xl font-bold">Your workspace starts here</h2><p className="mt-2 text-slate-500">Create your first form to start collecting responses.</p><button className="btn btn-primary mt-5" onClick={()=>setEditing(emptyForm())}>Create a form</button></div>}</div> : <div className="mt-5 space-y-4">{submissions.map(sub=><article className="panel p-5" key={sub.id}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{forms.find(f=>f.id===sub.formId)?.title ?? "Form response"}</h3><time className="text-sm text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</time></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(sub.answers).map(([id,answer])=><div key={id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{forms.find(f=>f.id===sub.formId)?.questions.find(q=>q.id===id)?.label ?? "Answer"}</p><p className="mt-1 break-words text-sm font-medium">{answer}</p></div>)}</div></article>)}{submissions.length===0&&<div className="panel p-10 text-center text-slate-500">No submissions yet. Publish a form and share its link to collect responses.</div>}</div>}
    </div>
    {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8"><div className="mx-auto my-4 max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-indigo-600">FORM BUILDER</p><h2 className="mt-1 text-2xl font-black">{forms.some(f=>f.id===editing.id)?"Edit form":"Create a form"}</h2></div><button className="rounded-lg px-3 py-2 text-xl text-slate-500" onClick={()=>setEditing(null)} aria-label="Close">×</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Form title<input className="field mt-2 font-normal" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} required/></label><label className="text-sm font-bold">Description<textarea className="field mt-2 font-normal" rows={2} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label className="text-sm font-bold">Welcome message<input className="field mt-2 font-normal" value={editing.welcomeText} onChange={e=>setEditing({...editing,welcomeText:e.target.value})}/></label><label className="text-sm font-bold">Completion message<input className="field mt-2 font-normal" value={editing.completionText} onChange={e=>setEditing({...editing,completionText:e.target.value})}/></label><label className="text-sm font-bold">Accent color<input className="field mt-2 h-11 p-1" type="color" value={editing.accentColor} onChange={e=>setEditing({...editing,accentColor:e.target.value})}/></label><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/> Publish form</label></div>
      <div className="mt-8 flex items-center justify-between gap-3"><h3 className="text-lg font-black">Questions</h3><button className="btn btn-light text-sm" onClick={()=>setEditing({...editing,questions:[...editing.questions,{id:crypto.randomUUID(),label:"New question",type:"text",required:false}]})}>＋ Add question</button></div>
      <div className="mt-4 space-y-4">{editing.questions.map((q,index)=><div className="rounded-xl border border-slate-200 p-4" key={q.id}><div className="flex items-start gap-3"><span className="mt-3 text-sm font-black text-slate-400">{String(index+1).padStart(2,"0")}</span><div className="grid flex-1 gap-3 sm:grid-cols-[1fr_170px]"><input className="field" value={q.label} aria-label="Question label" onChange={e=>updateQuestion(index,{label:e.target.value})}/><select className="field" value={q.type} onChange={e=>updateQuestion(index,{type:e.target.value as typeof q.type,options:e.target.value==="choice"?(q.options?.length?q.options:["Option 1","Option 2"]):undefined})}><option value="text">Short text</option><option value="email">Email</option><option value="choice">Multiple choice</option><option value="yesno">Yes / No</option></select></div><button className="px-2 py-2 text-rose-600" onClick={()=>setEditing({...editing,questions:editing.questions.filter(item=>item.id!==q.id)})} aria-label="Delete question">✕</button></div>{q.type==="choice"&&<label className="mt-3 block pl-8 text-sm font-semibold">Options (separate with commas)<input className="field mt-2 font-normal" value={(q.options??[]).join(", ")} onChange={e=>updateQuestion(index,{options:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></label>}<label className="mt-3 flex items-center gap-2 pl-8 text-sm text-slate-600"><input type="checkbox" checked={q.required} onChange={e=>updateQuestion(index,{required:e.target.checked})}/> Required question</label><div className="mt-3 flex gap-2 pl-8"><button className="text-xs font-bold text-indigo-700 disabled:text-slate-300" disabled={index===0} onClick={()=>{const questions=[...editing.questions];[questions[index-1],questions[index]]=[questions[index],questions[index-1]];setEditing({...editing,questions});}}>↑ Move up</button><button className="text-xs font-bold text-indigo-700 disabled:text-slate-300" disabled={index===editing.questions.length-1} onClick={()=>{const questions=[...editing.questions];[questions[index+1],questions[index]]=[questions[index],questions[index+1]];setEditing({...editing,questions});}}>↓ Move down</button></div></div>)}</div>
      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t pt-5"><button className="btn btn-light" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>void save()}>Save form</button></div>
    </div></div>}
  </main>;
}
function Stat({label,value}:{label:string;value:number}) { return <div className="panel p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>; }
