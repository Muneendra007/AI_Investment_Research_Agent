import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Investment Research Agent | Powered by LangGraph",
  description:
    "AI-powered investment research agent that analyzes companies using multi-node LangGraph pipeline and delivers Invest/Pass decisions with reasoning and confidence scores.",
  keywords: [
    "AI",
    "investment",
    "research",
    "agent",
    "LangGraph",
    "stock analysis",
    "financial analysis",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-hero">
        {children}
      </body>
    </html>
  );
}
