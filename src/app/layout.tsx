import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraInvest AI | Debate-Driven Investment Committee",
  description:
    "Dual-mode institutional investment research terminal powered by LangGraph live market intelligence and Microsoft Agent Framework multi-agent debate RAG.",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-terminal-grid selection:bg-blue-600/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
