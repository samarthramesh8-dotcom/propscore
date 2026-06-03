import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import "./globals.css";
import CmdK from "@/components/CmdK";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropScore — Real Estate Investment Analyzer",
  description: "Paste a Zillow URL, get a brutally honest investment score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body>
        {children}
        <CmdK />
      </body>
    </html>
  );
}
