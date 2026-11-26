import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { site } from "@/content/site";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { Nav } from "@/components/chrome/Nav";
import { JumpTo } from "@/components/chrome/JumpTo";
import { Eggs } from "@/components/chrome/Eggs";
import { Footer } from "@/components/home/Footer";
import "./globals.css";

const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });
// Both fonts are SIL Open Font License 1.1 (free for commercial use). The site uses only these two.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: "variable", axes: ["opsz"], display: "swap" });

const title = `${site.name} — ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.fullName, url: site.github }],
  keywords: [site.fullName, site.name, "full stack developer", "Hyderabad", "AI assistant", "IoT", "ESP32", "AI-assisted development", "Three.js", "Next.js"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title,
    description: site.description,
    siteName: site.name,
    url: "/",
  },
  twitter: { card: "summary_large_image", title, description: site.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FF5A1F",
  width: "device-width",
  initialScale: 1,
};

/** Runs before first paint: marks JS as available. No loading screen: the wall is the entrance. */
const bootScript = `(function(){document.documentElement.classList.add('js')})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link t-label">
          Skip to content
        </a>
        <Nav />
        <JumpTo />
        <Eggs />
        {children}
        <Footer />
        <SmoothScroll />
      </body>
    </html>
  );
}
