import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LISA",
  description:
    "Mapa interactivo para visualizar establecimientos donde realizar el SERUMS en Perú.",
  icons: {
    icon: [{ url: "/Lisa%20personaje.png", type: "image/png" }],
    shortcut: [{ url: "/Lisa%20personaje.png", type: "image/png" }],
    apple: [{ url: "/Lisa%20personaje.png", type: "image/png" }],
  },
  openGraph: {
    title: "LISA",
    description: "Mapa interactivo para visualizar establecimientos donde realizar el SERUMS en Perú.",
    type: "website",
    locale: "es_PE",
    siteName: "LISA",
  },
  twitter: {
    card: "summary",
    title: "LISA",
    description: "Mapa interactivo para visualizar establecimientos donde realizar el SERUMS en Perú.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} antialiased`}>{children}</body>
    </html>
  );
}
