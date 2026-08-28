import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraInvest AI | Autonomous Investment Research Terminal",
  description:
    "Institutional-grade autonomous investment research agent powered by multi-node LangGraph pipeline and ultra-fast Groq LPU inference.",
  keywords: [
    "AI Investment Research",
    "Stock Analysis",
    "LangGraph Multi-Agent",
    "Groq AI",
    "Financial Intelligence",
    "Equity Research",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-terminal-grid selection:bg-cyan-500/20 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
