import type { Metadata, Viewport } from "next";
import { Figtree, Playfair_Display } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rebel Mind Zone",
  description:
    "Rebel Mind Zone builds brand identities, campaigns and digital experiences. Cairo, Egypt.",
};

export const viewport: Viewport = { themeColor: "#0F0F0E" };

/** Root layout: fonts and document only. The public site header lives in the (site) group; /admin has its own shell. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
