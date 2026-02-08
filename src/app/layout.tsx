import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION_EN, fullUrl } from "@/lib/seo";

const displayFont = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const ogImage = `${SITE_URL}/images/logo.png`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1417",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Custom Luxury Watches & Watchmaking Montreal`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION_EN,
  keywords: [
    "luxury watches",
    "custom watches",
    "Montreal watchmaker",
    "artisan watches",
    "bespoke timepieces",
    "watch configurator",
    "Ciavaglia",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Custom Luxury Watches Montreal`,
    description: DEFAULT_DESCRIPTION_EN,
    images: [{ url: ogImage, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Custom Luxury Watches`,
    description: DEFAULT_DESCRIPTION_EN,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    // Optional: add when you have them
    // google: "google-site-verification-code",
    // yandex: "yandex-verification-code",
  },
  alternates: {
    canonical: fullUrl("/en"),
    languages: { "en-CA": fullUrl("/en"), "fr-CA": fullUrl("/fr") },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
