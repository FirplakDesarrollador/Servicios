import type { Metadata } from "next";
import { Outfit, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AparienciaFlotante, { SCRIPT_APARIENCIA } from "@/components/Apariencia";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firplak Servicios",
  description: "Sistema de gestión de servicios Firplak",
};

// Disable caching to prevent loading state issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_APARIENCIA }} />
      </head>
      <body
        className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="fondo-liquido" aria-hidden="true"><span /><span /><span /><span /></div>
        {children}
        <AparienciaFlotante />
      </body>
    </html>
  );
}
