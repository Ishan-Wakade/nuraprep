import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
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
  title: {
    default: "NuraPrep | Thoughtful TEAS Math Practice",
    template: "%s | NuraPrep",
  },
  description:
    "An independent TEAS Math preparation platform for focused practice, clear explanations, and transparent progress.",
  applicationName: "NuraPrep",
  authors: [{ name: "Ishan Wakade" }],
  keywords: [
    "TEAS Math",
    "nursing school preparation",
    "adaptive practice",
    "math practice",
  ],
  openGraph: {
    title: "NuraPrep | Thoughtful TEAS Math Practice",
    description:
      "Focused practice, clear explanations, and honest progress for TEAS Math.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
