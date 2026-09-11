import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
