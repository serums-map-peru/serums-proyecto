import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
