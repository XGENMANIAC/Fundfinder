import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundFinder — AI-Powered Funding Discovery",
  description: "Discover, qualify, and apply for grants, accelerators, and funding programs automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                FF
              </div>
              <span className="font-semibold text-white text-sm">FundFinder</span>
            </div>
            <span className="text-xs text-white/40">Multi-Agent Funding System</span>
          </div>
        </nav>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
