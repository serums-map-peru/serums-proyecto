import { redirect } from "next/navigation";

export default async function EstablecimientoPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams?.id || "").trim();
  if (!id) redirect("/");
  redirect(`/?h=${encodeURIComponent(id)}`);
}
