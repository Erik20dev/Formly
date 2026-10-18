
import { getForm } from "@/lib/store";
import { notFound } from "next/navigation";
import PublicForm from "@/components/PublicForm";

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  const { embed } = await searchParams;

  const form = await getForm(id);

  if (!form || !form.published) notFound();

  return <PublicForm form={form} embedded={embed === "1"} />;
}

