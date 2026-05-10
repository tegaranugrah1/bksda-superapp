import PublicNavbar from "./_components/PublicNavbar";
import PublicFooter from "./_components/PublicFooter";

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
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}




