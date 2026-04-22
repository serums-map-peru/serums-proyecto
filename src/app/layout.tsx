import type { Metadata } from "next";
import Script from "next/script";
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
    icon: [{ url: "/Lisa%20personaje.png?v=2", type: "image/png" }],
    shortcut: [{ url: "/Lisa%20personaje.png?v=2", type: "image/png" }],
    apple: [{ url: "/Lisa%20personaje.png?v=2", type: "image/png" }],
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
  const GA_ID = "G-X18S174Q36";
  return (
    <html lang="es">
      <head>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className={`${outfit.variable} antialiased`}>{children}</body>
    </html>
  );
}
