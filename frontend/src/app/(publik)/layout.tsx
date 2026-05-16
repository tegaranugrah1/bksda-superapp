import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "BKSDA — Balai Konservasi Sumber Daya Alam",
  description:
    "Website resmi Balai Konservasi Sumber Daya Alam — Kementerian Lingkungan Hidup dan Kehutanan Republik Indonesia.",
};

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
