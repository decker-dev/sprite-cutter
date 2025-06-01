import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: {
    default: "Sprite Cutter - Herramienta Online para Recortar Sprites",
    template: "%s | Sprite Cutter",
  },
  description:
    "Herramienta gratuita online para recortar sprites de imágenes. Sube tu imagen, marca las áreas que quieres recortar y descarga todos los sprites por separado. Perfecto para desarrolladores de videojuegos y diseñadores.",
  keywords: [
    "sprite cutter",
    "recortar sprites",
    "herramienta sprites",
    "game development",
    "pixel art",
    "sprite sheet",
    "recortar imágenes",
    "desarrollo videojuegos",
    "sprites online",
    "sprite editor",
  ],
  authors: [{ name: "Sprite Cutter Team" }],
  creator: "v0.dev",
  publisher: "Vercel",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://sprite-cutter.vercel.app",
    title: "Sprite Cutter - Herramienta Online para Recortar Sprites",
    description:
      "Herramienta gratuita para recortar sprites de imágenes. Marca áreas, ve previews y descarga todos los sprites por separado.",
    siteName: "Sprite Cutter",
    images: [
      {
        url: "/placeholder.svg?height=630&width=1200",
        width: 1200,
        height: 630,
        alt: "Sprite Cutter - Interfaz de la herramienta para recortar sprites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprite Cutter - Herramienta Online para Recortar Sprites",
    description:
      "Herramienta gratuita para recortar sprites. Sube imágenes, marca áreas y descarga sprites individuales.",
    images: ["/placeholder.svg?height=630&width=1200"],
    creator: "@vercel",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  category: "technology",
  classification: "Game Development Tool",
  referrer: "origin-when-cross-origin",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },
  alternates: {
    canonical: "https://sprite-cutter.vercel.app",
    languages: {
      "es-ES": "https://sprite-cutter.vercel.app",
      "en-US": "https://sprite-cutter.vercel.app/en",
    },
  },
  other: {
    "application-name": "Sprite Cutter",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Sprite Cutter",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-tap-highlight": "no",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
