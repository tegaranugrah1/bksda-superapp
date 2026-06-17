"use client";

import { useCallback, useMemo, useState } from "react";

import { ReorderPanel } from "./_components/ReorderPanel";
import { SummaryTile } from "./_components/SummaryTile";
import { handlePrintBa } from "./_components/BaKoreksiDocument";
import { handlePrintSk } from "./_components/SkPenghentianDocument";
import { handlePrintSkPanitia } from "./_components/SkPanitiaDocument";
import { handlePrintSkTimPenilai } from "./_components/SkTimPenilaiDocument";
import { handlePrintSptjLimit } from "./_components/SptjLimitDocument";
import { handlePrintSptjm } from "./_components/SptjmDocument";
import { handlePrintSpTugas } from "./_components/SpTugasDocument";
import { handlePrintSkKebenaran } from "./_components/SkKebenaranDokumenDocument";
import { handlePrintBaPemeriksaan } from "./_components/BaPemeriksaanDocument";
import { handlePrintNotaDinas } from "./_components/NotaDinasDocument";
import { handlePrintPermohonanKpknl } from "./_components/PermohonanKpknlDocument";
import { PageHeader } from "./_components/PageHeader";
import { DocumentActions } from "./_components/DocumentActions";
import { SearchBar } from "./_components/SearchBar";
import { SelectedAssetsBanner } from "./_components/SelectedAssetsBanner";
import { WorkflowSteps } from "./_components/WorkflowSteps";
import { KepalaBalaiPicker } from "./_components/KepalaBalaiPicker";
import { AssetTable } from "./_components/AssetTable";
import { BaKoreksiSection } from "./_components/sections/BaKoreksiSection";
import { SkPenghentianSection } from "./_components/sections/SkPenghentianSection";
import { SkPanitiaSection } from "./_components/sections/SkPanitiaSection";
import { SkTimPenilaiSection } from "./_components/sections/SkTimPenilaiSection";
import { SptjLimitSection } from "./_components/sections/SptjLimitSection";
import { SptjmSection } from "./_components/sections/SptjmSection";
import { SpTugasSection } from "./_components/sections/SpTugasSection";
import { SkKebenaranSection } from "./_components/sections/SkKebenaranSection";
import { BaPemeriksaanSection } from "./_components/sections/BaPemeriksaanSection";
import { NotaDinasSection } from "./_components/sections/NotaDinasSection";
import { PermohonanKpknlSection } from "./_components/sections/PermohonanKpknlSection";
import { KertasKerjaAssetSection } from "./_components/KertasKerjaAssetSection";
import { formatRupiah } from "./_lib/auction-helpers";

import { useAuctionAssets } from "./_hooks/useAuctionAssets";
import { useDocumentToggles } from "./_hooks/useDocumentToggles";
import { useDocumentNumbers } from "./_hooks/useDocumentNumbers";
import { useEmployeeOptions } from "./_hooks/useEmployeeOptions";
import { usePemeriksaList } from "./_hooks/usePemeriksaList";
import { usePanitiaList } from "./_hooks/usePanitiaList";
import { useTimPenilaiList } from "./_hooks/useTimPenilaiList";
import { useSkBuilderState } from "./_hooks/useSkBuilderState";
import { useSkPanitiaBuilderState } from "./_hooks/useSkPanitiaBuilderState";
import { useSkTimPenilaiBuilderState } from "./_hooks/useSkTimPenilaiBuilderState";
import { useNotaKpknlBuilderState } from "./_hooks/useNotaKpknlBuilderState";

export default function BmnAuctionCandidatesPage() {
  const auctionAssets = useAuctionAssets();
  const docToggles = useDocumentToggles(auctionAssets.orderedIds.length);
  const docNumbers = useDocumentNumbers();
  const { sortedEmployeesForPanitia } = useEmployeeOptions();
  const pemeriksa = usePemeriksaList();
  const panitia = usePanitiaList();
  const timPenilai = useTimPenilaiList();
  const sk = useSkBuilderState();
  const skPanitia = useSkPanitiaBuilderState();
  const skTimPenilai = useSkTimPenilaiBuilderState();
  const notaKpknl = useNotaKpknlBuilderState();
  const [worksheetAssetId, setWorksheetAssetId] = useState<string | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    perPage,
    setPerPage,
    orderedIds,
    setOrderedIds,
    response,
    isLoading,
    isFetching,
    totalRusakBerat,
    assets,
    selectedIds,
    orderedSelectedAssets,
    selectedTotal,
    allSelected,
    toggleSelect,
    toggleSelectAll,
    moveUp,
    moveDown,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
  } = auctionAssets;

  const { setShowDocument } = docToggles;

  const worksheetNumberByAssetId = useMemo(
    () => new Map(orderedSelectedAssets.map((asset, index) => [asset.id, index + 1])),
    [orderedSelectedAssets],
  );
  const activeWorksheetAsset = useMemo(
    () => orderedSelectedAssets.find((asset) => asset.id === worksheetAssetId),
    [orderedSelectedAssets, worksheetAssetId],
  );
  const activeWorksheetNumber = worksheetAssetId
    ? worksheetNumberByAssetId.get(worksheetAssetId) || 1
    : 1;
  const generatedDocumentCount = useMemo(
    () =>
      [
        docToggles.showDocument,
        docToggles.showSkDocument,
        docToggles.showSkPanitia,
        docToggles.showSkTimPenilai,
        docToggles.showSptjLimit,
        docToggles.showSptjm,
        docToggles.showSpTugas,
        docToggles.showSkKebenaran,
        docToggles.showBaPemeriksaan,
        docToggles.showNotaDinas,
        docToggles.showPermohonanKpknl,
      ].filter(Boolean).length,
    [
      docToggles.showDocument,
      docToggles.showSkDocument,
      docToggles.showSkPanitia,
      docToggles.showSkTimPenilai,
      docToggles.showSptjLimit,
      docToggles.showSptjm,
      docToggles.showSpTugas,
      docToggles.showSkKebenaran,
      docToggles.showBaPemeriksaan,
      docToggles.showNotaDinas,
      docToggles.showPermohonanKpknl,
    ],
  );

  const handleOpenWorksheet = useCallback((assetId: string) => {
    setWorksheetAssetId(assetId);
    window.setTimeout(() => {
      document.getElementById("kertas-kerja-preview")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }, []);

  // Wrappers that combine selection mutations with showDocument reset to
  // preserve the original page behaviour.
  const handleResetSelection = useCallback(() => {
    setOrderedIds([]);
    setShowDocument(false);
    setWorksheetAssetId(null);
  }, [setOrderedIds, setShowDocument]);

  const handleToggleSelect = useCallback(
    (id: string) => {
      toggleSelect(id);
      setShowDocument(false);
      if (worksheetAssetId === id) setWorksheetAssetId(null);
    },
    [toggleSelect, setShowDocument, worksheetAssetId],
  );

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      toggleSelectAll();
      setShowDocument(false);
      setWorksheetAssetId(null);
      return;
    }
    toggleSelectAll();
  }, [allSelected, toggleSelectAll, setShowDocument]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setPage(1);
      setOrderedIds([]);
      setShowDocument(false);
      setWorksheetAssetId(null);
    },
    [setSearchTerm, setPage, setOrderedIds, setShowDocument],
  );

  const handlePerPageChange = useCallback(
    (value: number) => {
      setPerPage(value);
      setPage(1);
      setOrderedIds([]);
      setShowDocument(false);
      setWorksheetAssetId(null);
    },
    [setPerPage, setPage, setOrderedIds, setShowDocument],
  );

  const handlePrint = () => handlePrintBa(orderedSelectedAssets);
  const handlePrintSkDoc = () => handlePrintSk(orderedSelectedAssets, docNumbers.skNumber);
  const handlePrintSkPanitiaDoc = () => handlePrintSkPanitia();
  const handlePrintSkTimPenilaiDoc = () => handlePrintSkTimPenilai();
  const handlePrintSptjLimitDoc = () => handlePrintSptjLimit();
  const handlePrintSptjmDoc = () => handlePrintSptjm();
  const handlePrintSpTugasDoc = () => handlePrintSpTugas();
  const handlePrintSkKebenaranDoc = () => handlePrintSkKebenaran();
  const handlePrintBaPemeriksaanDoc = () => handlePrintBaPemeriksaan();
  const handlePrintNotaDinasDoc = () => handlePrintNotaDinas();
  const handlePrintPermohonanKpknlDoc = () => handlePrintPermohonanKpknl();

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        orderedIdsLength={orderedIds.length}
        onResetSelection={handleResetSelection}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label="Total Rusak Berat" value={totalRusakBerat.toLocaleString("id-ID")} tone="red" />
        <SummaryTile label="Dipilih" value={orderedIds.length.toLocaleString("id-ID")} tone="emerald" />
        <SummaryTile label="Nilai Terpilih" value={formatRupiah(selectedTotal)} tone="zinc" />
      </div>

      <WorkflowSteps
        selectedCount={orderedIds.length}
        generatedDocumentCount={generatedDocumentCount}
      />

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        isFetching={isFetching}
        isLoading={isLoading}
      />

      <AssetTable
        assets={assets}
        selectedIds={selectedIds}
        allSelected={allSelected}
        isLoading={isLoading}
        response={response}
        page={page}
        perPage={perPage}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onPerPageChange={handlePerPageChange}
        onPageChange={setPage}
        worksheetNumberByAssetId={worksheetNumberByAssetId}
        onOpenWorksheet={handleOpenWorksheet}
      />

      <SelectedAssetsBanner
        orderedIdsLength={orderedIds.length}
        showDocument={docToggles.showDocument}
        showSkDocument={docToggles.showSkDocument}
        showSkPanitia={docToggles.showSkPanitia}
        showSkTimPenilai={docToggles.showSkTimPenilai}
        showSptjLimit={docToggles.showSptjLimit}
        showSptjm={docToggles.showSptjm}
        showSpTugas={docToggles.showSpTugas}
        showSkKebenaran={docToggles.showSkKebenaran}
        showBaPemeriksaan={docToggles.showBaPemeriksaan}
        showNotaDinas={docToggles.showNotaDinas}
        showPermohonanKpknl={docToggles.showPermohonanKpknl}
        onPrint={handlePrint}
        onPrintSk={handlePrintSkDoc}
        onPrintSkPanitia={handlePrintSkPanitiaDoc}
        onPrintSkTimPenilai={handlePrintSkTimPenilaiDoc}
        onPrintSptjLimit={handlePrintSptjLimitDoc}
        onPrintSptjm={handlePrintSptjmDoc}
        onPrintSpTugas={handlePrintSpTugasDoc}
        onPrintSkKebenaran={handlePrintSkKebenaranDoc}
        onPrintBaPemeriksaan={handlePrintBaPemeriksaanDoc}
        onPrintNotaDinas={handlePrintNotaDinasDoc}
        onPrintPermohonanKpknl={handlePrintPermohonanKpknlDoc}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <KepalaBalaiPicker kepalaBalai={sk.kepalaBalai} setKepalaBalai={sk.setKepalaBalai} />
        </div>
        <DocumentActions
          orderedIdsLength={orderedIds.length}
          onProcess={docToggles.handleProcess}
          onProcessSk={docToggles.handleProcessSk}
          onProcessSkPanitia={docToggles.handleProcessSkPanitia}
          onProcessSkTimPenilai={docToggles.handleProcessSkTimPenilai}
          onProcessSptjLimit={docToggles.handleProcessSptjLimit}
          onProcessSptjm={docToggles.handleProcessSptjm}
          onProcessSpTugas={docToggles.handleProcessSpTugas}
          onProcessSkKebenaran={docToggles.handleProcessSkKebenaran}
          onProcessBaPemeriksaan={docToggles.handleProcessBaPemeriksaan}
          onProcessNotaDinas={docToggles.handleProcessNotaDinas}
          onProcessPermohonanKpknl={docToggles.handleProcessPermohonanKpknl}
        />
      </div>

      {orderedIds.length > 0 && (
        <ReorderPanel
          orderedIds={orderedIds}
          orderedSelectedAssets={orderedSelectedAssets}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragEnd={handleDragEnd}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onOpenWorksheet={handleOpenWorksheet}
        />
      )}

      {activeWorksheetAsset && (
        <KertasKerjaAssetSection
          key={activeWorksheetAsset.id}
          asset={activeWorksheetAsset}
          worksheetNumber={activeWorksheetNumber}
          employees={sortedEmployeesForPanitia}
          onClose={() => setWorksheetAssetId(null)}
        />
      )}

      {docToggles.showDocument && orderedSelectedAssets.length > 0 && (
        <BaKoreksiSection
          assets={orderedSelectedAssets}
          baNumber={docNumbers.baNumber}
          setBaNumber={docNumbers.setBaNumber}
          baKap={docNumbers.baKap}
          setBaKap={docNumbers.setBaKap}
          kepalaBalai={sk.kepalaBalai}
          onPrint={handlePrint}
        />
      )}

      {docToggles.showSkDocument && orderedSelectedAssets.length > 0 && (
        <SkPenghentianSection
          assets={orderedSelectedAssets}
          skNumber={docNumbers.skNumber}
          setSkNumber={docNumbers.setSkNumber}
          skKap={docNumbers.skKap}
          setSkKap={docNumbers.setSkKap}
          menimbang={sk.menimbang}
          setMenimbang={sk.setMenimbang}
          mengingat={sk.mengingat}
          setMengingat={sk.setMengingat}
          memutuskan={sk.memutuskan}
          setMemutuskan={sk.setMemutuskan}
          kepalaBalai={sk.kepalaBalai}
          setKepalaBalai={sk.setKepalaBalai}
          tembusan={sk.tembusan}
          setTembusan={sk.setTembusan}
          onPrint={handlePrintSkDoc}
        />
      )}

      {docToggles.showSkPanitia && orderedIds.length > 0 && (
        <SkPanitiaSection
          skPanitiaNumber={docNumbers.skPanitiaNumber}
          setSkPanitiaNumber={docNumbers.setSkPanitiaNumber}
          skPanitiaKap={docNumbers.skPanitiaKap}
          setSkPanitiaKap={docNumbers.setSkPanitiaKap}
          panitiaMenimbang={skPanitia.panitiaMenimbang}
          setPanitiaMenimbang={skPanitia.setPanitiaMenimbang}
          panitiaMengingat={skPanitia.panitiaMengingat}
          setPanitiaMengingat={skPanitia.setPanitiaMengingat}
          panitiaMemutuskan={skPanitia.panitiaMemutuskan}
          setPanitiaMemutuskan={skPanitia.setPanitiaMemutuskan}
          kepalaBalai={sk.kepalaBalai}
          setKepalaBalai={sk.setKepalaBalai}
          panitiaTembusan={skPanitia.panitiaTembusan}
          setPanitiaTembusan={skPanitia.setPanitiaTembusan}
          susunanPanitia={panitia.susunanPanitia}
          employees={sortedEmployeesForPanitia}
          onAddPanitia={panitia.addPanitiaAnggota}
          onRemovePanitia={panitia.removePanitiaAnggota}
          onUpdatePanitia={panitia.updatePanitiaAnggota}
          onSelectPanitiaEmployee={panitia.selectPanitiaEmployee}
          onPrint={handlePrintSkPanitiaDoc}
        />
      )}

      {docToggles.showSkTimPenilai && orderedIds.length > 0 && (
        <SkTimPenilaiSection
          skTimPenilaiNumber={docNumbers.skTimPenilaiNumber}
          setSkTimPenilaiNumber={docNumbers.setSkTimPenilaiNumber}
          skTimPenilaiKap={docNumbers.skTimPenilaiKap}
          setSkTimPenilaiKap={docNumbers.setSkTimPenilaiKap}
          timPenilaiMenimbang={skTimPenilai.timPenilaiMenimbang}
          setTimPenilaiMenimbang={skTimPenilai.setTimPenilaiMenimbang}
          timPenilaiMengingat={skTimPenilai.timPenilaiMengingat}
          setTimPenilaiMengingat={skTimPenilai.setTimPenilaiMengingat}
          timPenilaiMemutuskan={skTimPenilai.timPenilaiMemutuskan}
          setTimPenilaiMemutuskan={skTimPenilai.setTimPenilaiMemutuskan}
          kepalaBalai={sk.kepalaBalai}
          setKepalaBalai={sk.setKepalaBalai}
          timPenilaiTembusan={skTimPenilai.timPenilaiTembusan}
          setTimPenilaiTembusan={skTimPenilai.setTimPenilaiTembusan}
          susunanTimPenilai={timPenilai.susunanTimPenilai}
          employees={sortedEmployeesForPanitia}
          onAddTimPenilai={timPenilai.addTimPenilaiAnggota}
          onRemoveTimPenilai={timPenilai.removeTimPenilaiAnggota}
          onUpdateTimPenilai={timPenilai.updateTimPenilaiAnggota}
          onSelectTimPenilaiEmployee={timPenilai.selectTimPenilaiEmployee}
          onPrint={handlePrintSkTimPenilaiDoc}
        />
      )}

      {docToggles.showSptjLimit && (
        <SptjLimitSection
          number={docNumbers.sptjLimitNumber}
          setNumber={docNumbers.setSptjLimitNumber}
          kap={docNumbers.sptjLimitKap}
          setKap={docNumbers.setSptjLimitKap}
          kepalaBalai={sk.kepalaBalai}
          onPrint={handlePrintSptjLimitDoc}
        />
      )}

      {docToggles.showSptjm && (
        <SptjmSection
          number={docNumbers.sptjmNumber}
          setNumber={docNumbers.setSptjmNumber}
          kap={docNumbers.sptjmKap}
          setKap={docNumbers.setSptjmKap}
          kepalaBalai={sk.kepalaBalai}
          onPrint={handlePrintSptjmDoc}
        />
      )}

      {docToggles.showSpTugas && (
        <SpTugasSection
          number={docNumbers.spTugasNumber}
          setNumber={docNumbers.setSpTugasNumber}
          kap={docNumbers.spTugasKap}
          setKap={docNumbers.setSpTugasKap}
          kepalaBalai={sk.kepalaBalai}
          onPrint={handlePrintSpTugasDoc}
        />
      )}

      {docToggles.showSkKebenaran && orderedSelectedAssets.length > 0 && (
        <SkKebenaranSection
          assets={orderedSelectedAssets}
          number={docNumbers.skKebenaranNumber}
          setNumber={docNumbers.setSkKebenaranNumber}
          kap={docNumbers.skKebenaranKap}
          setKap={docNumbers.setSkKebenaranKap}
          kepalaBalai={sk.kepalaBalai}
          onPrint={handlePrintSkKebenaranDoc}
        />
      )}

      {docToggles.showBaPemeriksaan && orderedSelectedAssets.length > 0 && (
        <BaPemeriksaanSection
          assets={orderedSelectedAssets}
          number={docNumbers.baPemeriksaanNumber}
          setNumber={docNumbers.setBaPemeriksaanNumber}
          kap={docNumbers.baPemeriksaanKap}
          setKap={docNumbers.setBaPemeriksaanKap}
          stNumber={docNumbers.stNumber}
          setStNumber={docNumbers.setStNumber}
          stTanggal={docNumbers.stTanggal}
          setStTanggal={docNumbers.setStTanggal}
          kepalaBalai={sk.kepalaBalai}
          pemeriksaList={pemeriksa.pemeriksaList}
          employees={sortedEmployeesForPanitia}
          onAddPemeriksa={pemeriksa.addPemeriksaAnggota}
          onRemovePemeriksa={pemeriksa.removePemeriksaAnggota}
          onUpdatePemeriksa={pemeriksa.updatePemeriksaAnggota}
          onSelectPemeriksaEmployee={pemeriksa.selectPemeriksaEmployee}
          onPrint={handlePrintBaPemeriksaanDoc}
        />
      )}

      {docToggles.showNotaDinas && orderedSelectedAssets.length > 0 && (
        <NotaDinasSection
          assets={orderedSelectedAssets}
          number={docNumbers.notaDinasNumber}
          setNumber={docNumbers.setNotaDinasNumber}
          kap={docNumbers.notaDinasKap}
          setKap={docNumbers.setNotaDinasKap}
          kepalaBalai={sk.kepalaBalai}
          perihal={notaKpknl.ndPerihal}
          setPerihal={notaKpknl.setNdPerihal}
          lampiran={notaKpknl.ndLampiran}
          setLampiran={notaKpknl.setNdLampiran}
          lokasi={notaKpknl.ndLokasi}
          setLokasi={notaKpknl.setNdLokasi}
          tembusan={notaKpknl.ndTembusan}
          setTembusan={notaKpknl.setNdTembusan}
          kesimpulan={notaKpknl.ndKesimpulan}
          setKesimpulan={notaKpknl.setNdKesimpulan}
          nilaiTaksiran={notaKpknl.ndNilaiTaksiran}
          setNilaiTaksiran={notaKpknl.setNdNilaiTaksiran}
          onPrint={handlePrintNotaDinasDoc}
        />
      )}

      {docToggles.showPermohonanKpknl && orderedSelectedAssets.length > 0 && (
        <PermohonanKpknlSection
          assets={orderedSelectedAssets}
          number={docNumbers.permohonanKpknlNumber}
          setNumber={docNumbers.setPermohonanKpknlNumber}
          kap={docNumbers.permohonanKpknlKap}
          setKap={docNumbers.setPermohonanKpknlKap}
          kepalaBalai={sk.kepalaBalai}
          perihal={notaKpknl.pkPerihal}
          setPerihal={notaKpknl.setPkPerihal}
          lampiran={notaKpknl.pkLampiran}
          setLampiran={notaKpknl.setPkLampiran}
          lokasi={notaKpknl.pkLokasi}
          setLokasi={notaKpknl.setPkLokasi}
          tembusan={notaKpknl.pkTembusan}
          setTembusan={notaKpknl.setPkTembusan}
          kesimpulan={notaKpknl.pkKesimpulan}
          setKesimpulan={notaKpknl.setPkKesimpulan}
          onPrint={handlePrintPermohonanKpknlDoc}
        />
      )}
    </div>
  );
}
