import { redirect } from "next/navigation";

/** /work-v3 → the first sample project. */
export default function WorkV3Index() {
  redirect("/work-v3/alpha");
}
