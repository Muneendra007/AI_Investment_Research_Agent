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
