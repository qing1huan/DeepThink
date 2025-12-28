import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DeepThink v4.2 | Chain of Thought Visualization",
  description: "A specialized LLM dialogue platform designed to visualize Chain of Thought reasoning",
  keywords: ["AI", "LLM", "Chain of Thought", "DeepSeek", "Reasoning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans h-full`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
