import Image from 'next/image';

export default function SuratTugasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-500/30">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-1">
              <Image src="/assets/images/logo/logo_bksda.png" alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Pengajuan Surat Tugas</h1>
              <p className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">BKSDA KALTIM</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {children}
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}
