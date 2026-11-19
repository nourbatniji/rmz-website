import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/session";

export default async function OldHomepage() {
  await requireAdmin();
  redirect("/admin/website");
}
