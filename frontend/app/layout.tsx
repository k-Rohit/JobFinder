import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobFinder — Data & AI Engineer Jobs",
  description:
    "A focused job dashboard for remote, hybrid and in-office Data & AI/LLM roles.",
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f8ae8"/><stop offset="1" stop-color="#9085e9"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="15" fill="url(#g)"/><circle cx="27" cy="27" r="13" fill="none" stroke="#fff" stroke-width="5"/><line x1="37" y1="37" x2="50" y2="50" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="20" y="25" width="14" height="9" rx="1.6" fill="#fff"/><path d="M24 25v-2.2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V25" fill="none" stroke="#fff" stroke-width="2.4"/></svg>`
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('jf-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
