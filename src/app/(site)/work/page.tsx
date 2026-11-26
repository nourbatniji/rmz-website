import { redirect } from "next/navigation";

/** The Work archive lives on the homepage (after Minds); /work simply lands there. */
export default function WorkPage() {
  redirect("/#work");
}
