import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Methodology Explorer",
  description:
    "Open archive of carbon registry methodology documents. Version-controlled, machine-readable, updated monthly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <header className="mb-10">
            <div className="flex items-center justify-between">
              <a href="/" className="group">
                <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  carbon-methodology-archive
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-white mt-0.5">
                  Methodology Explorer
                </h1>
              </a>
              <a
                href="https://github.com/Doerp/carbon-methodology-archive"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-md"
              >
                GitHub ↗
              </a>
            </div>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl">
              Version-controlled archive of Verra and Isometric carbon methodology documents, updated monthly.
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
