import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";

export default function Home() {
  // The homepage reads content from the database; keep that read inside its own <Suspense> so the route shell stays instant.
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
