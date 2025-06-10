import type React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://sprite-cutter.vercel.app"),
  title: {
    default: "Sprite Cutter - Online Tool for Cutting Sprites",
    template: "%s | Sprite Cutter",
  },
  description:
    "Free online tool for cutting sprites from images. Upload your image, mark the areas you want to cut, and download all sprites separately. Perfect for game developers and designers.",
  keywords: [
    "sprite cutter",
    "cut sprites",
    "sprite tool",
    "game development",
    "pixel art",
    "sprite sheet",
    "cut images",
    "video game development",
    "online sprites",
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
    locale: "en_US",
    url: "https://sprite-cutter.vercel.app",
    title: "Sprite Cutter - Online Tool for Cutting Sprites",
    description:
      "Free tool for cutting sprites from images. Mark areas, see previews, and download all sprites separately.",
    siteName: "Sprite Cutter",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Sprite Cutter - Interface of the tool for cutting sprites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprite Cutter - Online Tool for Cutting Sprites",
    description:
      "Free tool for cutting sprites. Upload images, mark areas, and download individual sprites.",
    images: ["/og.png"],
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
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },
  alternates: {
    canonical: "https://sprite-cutter.vercel.app",
    languages: {
      "en-US": "https://sprite-cutter.vercel.app",
      "es-ES": "https://sprite-cutter.vercel.app/es",
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
  generator: "v0.dev",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
