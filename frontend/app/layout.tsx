import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/><circle cx="27" cy="27" r="13" fill="none" stroke="#fff" stroke-width="5"/><line x1="37" y1="37" x2="50" y2="50" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="20" y="25" width="14" height="9" rx="1.6" fill="#fff"/><path d="M24 25v-2.2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V25" fill="none" stroke="#fff" stroke-width="2.4"/></svg>`
  );

export const metadata: Metadata = {
  title: "JobFinder — Data & AI Engineer jobs, curated daily",
  description:
    "A focused job dashboard that fetches remote, hybrid and in-office Data & AI/LLM roles from 12+ sources, filters them to your profile, and tailors your résumé per role.",
  icons: { icon: [{ url: FAVICON, type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d12" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={GeistSans.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('jf-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
