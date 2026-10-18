import { getForm } from "@/lib/store";
import { notFound } from "next/navigation";
import PublicForm from "@/components/PublicForm";

export default async function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getForm(id);
  if (!form || !form.published) notFound();
  return <PublicForm form={form} />;
}
