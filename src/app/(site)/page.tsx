import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { PageLoader } from "@/components/brand/page-loader/PageLoader";
import { PageLoaderBoot } from "@/components/brand/page-loader/boot-script";

export default function Home() {
  // The loader cover is outside the <Suspense>: it is part of the very first HTML, so nothing of the page shows before it (see docs/page-loader.md).
  // The homepage reads content from the database; keep that read inside its own <Suspense> so the route shell stays instant.
  return (
    <>
      <PageLoader />
      <PageLoaderBoot />
      <Suspense fallback={null}>
        <HomePage />
      </Suspense>
    </>
  );
}
