import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BKSDA SuperApp - Pengajuan Surat Tugas",
  description: "Pengajuan Surat Tugas Online",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased min-h-screen bg-slate-50`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}