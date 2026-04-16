import type { Metadata } from "next";
import { Syne, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const tiroDevanagari = Tiro_Devanagari_Hindi({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "VEER",
  description: "AI-powered guidance for Indian government services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${tiroDevanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-syne)]">{children}</body>
    </html>
  );
}
