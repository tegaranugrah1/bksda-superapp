import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://bksdakaltim.net"),
  title: "BKSDA KALTIM | Kementerian Kehutanan",
  description: "Portal Resmi dan Sistem Informasi Administrasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur, Kementerian Kehutanan Republik Indonesia.",
  keywords: ["BKSDA KALTIM", "Kementerian Kehutanan", "KSDAE", "Konservasi Kalimantan Timur", "BKSDA SuperApp"],
  authors: [{ name: "BKSDA Kalimantan Timur" }],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo_bksda.png",
    shortcut: "/logo_bksda.png",
    apple: "/logo_bksda.png",
  },
  openGraph: {
    title: "BKSDA KALTIM | Kementerian Kehutanan",
    description: "Portal Resmi dan Sistem Informasi Administrasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur, Kementerian Kehutanan Republik Indonesia.",
    url: "https://bksdakaltim.net",
    siteName: "BKSDA KALTIM | Kementerian Kehutanan",
    images: [
      {
        url: "https://bksdakaltim.net/logo_bksda.png",
        width: 1200,
        height: 630,
        alt: "BKSDA KALTIM | Kementerian Kehutanan",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BKSDA KALTIM | Kementerian Kehutanan",
    description: "Portal Resmi dan Sistem Informasi Administrasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur, Kementerian Kehutanan Republik Indonesia.",
    images: ["https://bksdakaltim.net/logo_bksda.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
