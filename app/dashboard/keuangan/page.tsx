"use client";

import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { db, collection, onSnapshot, query, orderBy, addDoc } from "@/lib/firebase"; 
import { 
  LuWallet, LuArrowUp, LuArrowDown, LuPlus, LuFileText, LuX, LuSave, LuLoader, LuDownload, LuFilter
} from "react-icons/lu";

// Import Library Export
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// --- 1. NUCLEAR CONSOLE PATCH ---
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (/defaultProps/.test(args[0])) return;
    originalError.call(console, ...args);
  };
}

// --- TYPE DEFINITIONS ---
interface Transaksi {
  id: string;
  tanggal: string; 
  nominal: number;
  tipe: 'masuk' | 'keluar';
  keterangan: string;
}

interface CardStatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  bg: string;
  isCurrency?: boolean;
}

// --- HELPER FUNCTIONS ---
const formatRp = (num: number | string) => "Rp " + Number(num).toLocaleString("id-ID");
const formatRpNoSymbol = (num: number | string) => Number(num).toLocaleString("id-ID");
const formatDate = (date: string | number | Date) => {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatNumberDots = (num: string) => {
    return num.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi helper untuk load image ke Base64 (untuk PDF)
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
    img.src = url;
  });
};

// --- STYLES ---
const containerStyle: CSSProperties = { 
    background: "rgba(15,15,15,0.6)", border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.2rem', 
    display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};

const inputStyle: CSSProperties = {
    width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none', marginBottom: '1rem'
};

const labelStyle: CSSProperties = {
    display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.85rem', fontWeight: '500'
};

const selectStyle: CSSProperties = {
    width: '100%', padding: '12px', background: '#222', border: '1px solid #444',
    borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', marginBottom: '1rem'
};

export default function KeuanganPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State Form Transaksi
  const [formData, setFormData] = useState({
      keterangan: '',
      tipe: 'masuk' as 'masuk' | 'keluar',
      date: new Date().toISOString().split('T')[0],
  });
  const [displayNominal, setDisplayNominal] = useState('');
  const [realNominal, setRealNominal] = useState(0);

  // State Export Filter
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportType, setExportType] = useState<'all' | 'year' | 'month' | 'quarter'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedQuarter, setSelectedQuarter] = useState(1); // 1-4

  useEffect(() => {
    const q = query(collection(db, 'keuangan'), orderBy('tanggal', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaksi[];
      setTransaksi(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS (INPUT) ---
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const numericString = value.replace(/\./g, '').replace(/[^0-9]/g, '');
      const numberValue = parseInt(numericString || '0', 10);
      setRealNominal(numberValue);
      setDisplayNominal(numericString === '' ? '' : formatNumberDots(numericString));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.keterangan || realNominal <= 0) { alert("Mohon lengkapi data."); return; }
      setIsSubmitting(true);
      try {
          await addDoc(collection(db, 'keuangan'), {
              keterangan: formData.keterangan, nominal: realNominal, tipe: formData.tipe,
              tanggal: formData.date, createdAt: new Date().toISOString()
          });
          setFormData({ keterangan: '', tipe: 'masuk', date: new Date().toISOString().split('T')[0] });
          setDisplayNominal(''); setRealNominal(0); setShowModal(false);
      } catch (error) { console.error(error); alert("Gagal menyimpan."); } 
      finally { setIsSubmitting(false); }
  };

  // --- LOGIKA FILTER EXPORT ---
  const getFilteredData = () => {
    return transaksi.filter(t => {
        const d = new Date(t.tanggal);
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-11

        if (exportType === 'all') return true;
        if (exportType === 'year') return y === selectedYear;
        if (exportType === 'month') return y === selectedYear && m === selectedMonth;
        if (exportType === 'quarter') {
            const q = Math.floor(m / 3) + 1;
            return y === selectedYear && q === selectedQuarter;
        }
        return true;
    }).sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  };

  const getExportTitle = () => {
      if (exportType === 'all') return "Semua Periode";
      if (exportType === 'year') return `Tahun ${selectedYear}`;
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      if (exportType === 'month') return `${monthNames[selectedMonth]} ${selectedYear}`;
      if (exportType === 'quarter') return `Triwulan ${selectedQuarter} Tahun ${selectedYear}`;
      return "";
  };

  // --- FUNGSI EXPORT UTAMA ---
  const processExport = async () => {
    const dataToExport = getFilteredData();
    const periodTitle = getExportTitle();

    if (dataToExport.length === 0) {
        alert("Tidak ada data transaksi pada periode yang dipilih.");
        return;
    }

    let sumMasuk = 0;
    let sumKeluar = 0;
    dataToExport.forEach(t => {
        if (t.tipe === 'masuk') sumMasuk += Number(t.nominal);
        else sumKeluar += Number(t.nominal);
    });
    const sumSaldo = sumMasuk - sumKeluar;

    if (exportFormat === 'excel') {
        // --- EXPORT EXCEL ---
        const headerData = [
            ["KETUA RT. 02 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"],
            ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"], [],
            ["LAPORAN KEUANGAN"], [`Periode: ${periodTitle}`], [],
        ];
        const summaryData = [
            ["Total Pemasukan:", formatRp(sumMasuk), "", "Selisih Periode:", formatRp(sumSaldo)],
            ["Total Pengeluaran:", formatRp(sumKeluar), "", "", ""], []
        ];
        const tableHeader = ["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"];
        const tableBody = dataToExport.map((t, index) => [
            index + 1, formatDate(t.tanggal), t.keterangan,
            t.tipe === 'masuk' ? formatRpNoSymbol(t.nominal) : "-",
            t.tipe === 'keluar' ? formatRpNoSymbol(t.nominal) : "-"
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([...headerData, ...summaryData, tableHeader, ...tableBody]);
        worksheet['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
        XLSX.writeFile(workbook, `Laporan_${periodTitle.replace(/ /g, '_')}.xlsx`);

    } else {
        // --- EXPORT PDF ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        try {
            const imgData = await getBase64ImageFromURL('/logo-rt.png'); 
            doc.addImage(imgData, 'PNG', 14, 10, 20, 20);
        } catch (e) { console.warn("Logo missing"); }

        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("KETUA RT. 02 RW. 19", pageWidth / 2, 14, { align: "center" });
        doc.text("DESA DAYEUH", pageWidth / 2, 19, { align: "center" });
        doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 24, { align: "center" });
        
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 29, { align: "center" });
        doc.setLineWidth(0.5); doc.line(14, 32, pageWidth - 14, 32);

        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("LAPORAN KEUANGAN", pageWidth / 2, 40, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text(`Periode: ${periodTitle}`, pageWidth / 2, 45, { align: "center" });

        // Kotak Summary
        const startYSummary = 50;
        doc.setDrawColor(200); doc.setFillColor(250);
        doc.roundedRect(14, startYSummary, pageWidth - 28, 20, 1, 1, 'FD');

        doc.setFontSize(8); doc.setTextColor(50);
        doc.text("Total Pemasukan:", 20, startYSummary + 7);
        doc.setTextColor(0, 150, 0); doc.text(formatRp(sumMasuk), 50, startYSummary + 7);

        doc.setTextColor(50); doc.text("Total Pengeluaran:", 20, startYSummary + 14);
        doc.setTextColor(200, 0, 0); doc.text(formatRp(sumKeluar), 50, startYSummary + 14);

        doc.setTextColor(50); doc.text("Selisih/Saldo Periode:", pageWidth - 80, startYSummary + 11);
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text(formatRp(sumSaldo), pageWidth - 20, startYSummary + 11, { align: "right" });

        // FIX: Konversi index ke string agar tidak error di AutoTable
        const tableRows = dataToExport.map((t, index) => [
            (index + 1).toString(), // <- FIX DI SINI: Number to String
            formatDate(t.tanggal), 
            t.keterangan,
            t.tipe === 'masuk' ? formatRpNoSymbol(t.nominal) : "-",
            t.tipe === 'keluar' ? formatRpNoSymbol(t.nominal) : "-"
        ]);

        autoTable(doc, {
            head: [["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"]],
            body: tableRows,
            startY: startYSummary + 25,
            theme: 'grid',
            headStyles: { fillColor: [66, 103, 178], textColor: 255, fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9, textColor: 50 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'left' }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 }
            },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
                doc.text("Sistem Administrasi RT Kp. Cikadu", data.settings.margin.left, pageHeight - 10);
                doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - data.settings.margin.right, pageHeight - 10, { align: 'right' });
            }
        });
        doc.save(`Laporan_${periodTitle.replace(/ /g, '_')}.pdf`);
    }
    setShowExportModal(false);
  };

  // --- STATS UTAMA (DASHBOARD) ---
  const stats = useMemo(() => {
    let totalMasuk = 0, totalKeluar = 0, bulanIniMasuk = 0, bulanIniKeluar = 0;
    const now = new Date();
    
    transaksi.forEach(t => {
      const date = new Date(t.tanggal);
      const val = Number(t.nominal) || 0;
      if (t.tipe === 'masuk') totalMasuk += val; else totalKeluar += val;
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        if (t.tipe === 'masuk') bulanIniMasuk += val; else bulanIniKeluar += val;
      }
    });
    return { totalSaldo: totalMasuk - totalKeluar, bulanIniMasuk, bulanIniKeluar, totalTransaksi: transaksi.length };
  }, [transaksi]);

  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#00eaff', fontSize:'0.8rem'}}>Memuat Data...</div>;

  // --- DATA UNTUK DROPDOWN TAHUN (DINAMIS) ---
  const availableYears = Array.from(new Set(transaksi.map(t => new Date(t.tanggal).getFullYear()))).sort((a,b)=>b-a);
  if (!availableYears.includes(new Date().getFullYear())) availableYears.unshift(new Date().getFullYear());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <style>{`
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
          @media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; } }
          .custom-scroll::-webkit-scrollbar { width: 6px; }
          .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <div>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color:'#f59e0b', fontFamily: 'monospace', display:'flex', alignItems:'center', gap:'10px' }}><LuWallet /> Laporan Keuangan</h1>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>Rekapitulasi Kas & Transaksi Warga</p>
          </div>
      </div>

      {/* STATS */}
      <div className="stat-grid">
          <CardStat icon={<LuWallet />} label="Total Saldo" value={formatRp(stats.totalSaldo)} sub="TOTAL KAS" color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" isCurrency={true}/>
          <CardStat icon={<LuArrowUp />} label="Pemasukan" value={formatRp(stats.bulanIniMasuk)} sub="BULAN INI" color="#00ff88" bg="rgba(0, 255, 136, 0.1)" isCurrency={true}/>
          <CardStat icon={<LuArrowDown />} label="Pengeluaran" value={formatRp(stats.bulanIniKeluar)} sub="BULAN INI" color="#ef4444" bg="rgba(239, 68, 68, 0.1)" isCurrency={true}/>
          <CardStat icon={<LuFileText />} label="Transaksi" value={stats.totalTransaksi} sub="TOTAL DATA" color="#00eaff" bg="rgba(0, 234, 255, 0.1)"/>
      </div>

      {/* LIST RIWAYAT */}
      <div style={{ ...containerStyle, height: 'calc(100vh - 300px)', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'0.5rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight:'600' }}>Riwayat Transaksi</h3>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {/* TOMBOL BUKA MODAL EXPORT */}
                    <button onClick={() => setShowExportModal(true)} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                        <LuDownload /> Export Laporan
                    </button>
                    {/* TOMBOL TAMBAH TRANSAKSI */}
                    {/* FIX: size menggunakan String "16" */}
                    <button onClick={() => setShowModal(true)} style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', color: '#000', borderRadius: '6px', padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700', display:'flex', alignItems:'center', gap:'6px', boxShadow: '0 4px 12px rgba(0, 255, 136, 0.3)' }}>
                      <LuPlus size="16"/> Tambah Transaksi
                    </button>
                </div>
            </div>
            
            <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                {transaksi.length > 0 ? transaksi.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, background: t.tipe === 'masuk' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${t.tipe === 'masuk' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, color: t.tipe === 'masuk' ? '#00ff88' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                            {t.tipe === 'masuk' ? <LuArrowUp /> : <LuArrowDown />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.85rem', marginBottom:'2px' }}>{t.keterangan}</div>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>{formatDate(t.tanggal)}</div>
                        </div>
                        <div style={{ fontWeight: '700', color: t.tipe === 'masuk' ? '#00ff88' : '#ef4444', fontSize: '0.85rem' }}>
                            {t.tipe === 'masuk' ? '+' : '-'}{formatRp(t.nominal).replace('Rp ', '')}
                        </div>
                    </div>
                )) : <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.9rem' }}>Belum ada data transaksi.</div>}
            </div>
      </div>

      {/* --- MODAL KONFIGURASI EXPORT --- */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowExportModal(false)}>
            <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#00eaff', fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'10px' }}><LuFilter/> Filter Export</h3>
                    {/* FIX: size menggunakan String "24" */}
                    <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><LuX size="24"/></button>
                </div>

                <label style={labelStyle}>Format Dokumen</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                     <button onClick={() => setExportFormat('pdf')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: exportFormat === 'pdf' ? '1px solid #ff4d4f' : '1px solid #333', background: exportFormat === 'pdf' ? 'rgba(255, 77, 79, 0.1)' : 'transparent', color: exportFormat === 'pdf' ? '#ff4d4f' : '#666', fontWeight: 'bold', cursor: 'pointer', transition:'0.2s' }}>PDF</button>
                     <button onClick={() => setExportFormat('excel')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: exportFormat === 'excel' ? '1px solid #00ff88' : '1px solid #333', background: exportFormat === 'excel' ? 'rgba(0, 255, 136, 0.1)' : 'transparent', color: exportFormat === 'excel' ? '#00ff88' : '#666', fontWeight: 'bold', cursor: 'pointer', transition:'0.2s' }}>Excel</button>
                </div>

                <label style={labelStyle}>Pilih Periode Laporan</label>
                <select value={exportType} onChange={(e) => setExportType(e.target.value as any)} style={selectStyle}>
                    <option value="month">Laporan Bulanan</option>
                    <option value="quarter">Laporan Triwulan (3 Bulan)</option>
                    <option value="year">Laporan Tahunan</option>
                    <option value="all">Semua Data (Keseluruhan)</option>
                </select>

                {exportType !== 'all' && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>
                        <label style={{...labelStyle, fontSize:'0.75rem'}}>Tahun</label>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{...selectStyle, marginBottom: exportType === 'year' ? 0 : '1rem'}}>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {exportType === 'month' && (
                            <>
                                <label style={{...labelStyle, fontSize:'0.75rem'}}>Bulan</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} style={{...selectStyle, marginBottom: 0}}>
                                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        {exportType === 'quarter' && (
                            <>
                                <label style={{...labelStyle, fontSize:'0.75rem'}}>Triwulan</label>
                                <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} style={{...selectStyle, marginBottom: 0}}>
                                    <option value={1}>Triwulan I (Jan - Mar)</option>
                                    <option value={2}>Triwulan II (Apr - Jun)</option>
                                    <option value={3}>Triwulan III (Jul - Sep)</option>
                                    <option value={4}>Triwulan IV (Okt - Des)</option>
                                </select>
                            </>
                        )}
                    </div>
                )}
                <button onClick={processExport} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00eaff 0%, #0077ff 100%)', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
                    <LuDownload /> Download Laporan
                </button>
            </div>
        </div>
      )}

      {/* --- MODAL TAMBAH TRANSAKSI --- */}
      {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowModal(false)}>
              <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem' }}>Tambah Transaksi</h3>
                      {/* FIX: size menggunakan String "24" */}
                      <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><LuX size="24"/></button>
                  </div>
                  <form onSubmit={handleSubmit}>
                      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                          <label style={{ flex: 1, cursor: 'pointer' }}>
                              <input type="radio" name="tipe" checked={formData.tipe === 'masuk'} onChange={() => setFormData({...formData, tipe: 'masuk'})} style={{ display: 'none' }} />
                              <div style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.9rem', background: formData.tipe === 'masuk' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.05)', color: formData.tipe === 'masuk' ? '#00ff88' : '#666', border: formData.tipe === 'masuk' ? '1px solid #00ff88' : '1px solid transparent', transition: 'all 0.2s' }}>Pemasukan</div>
                          </label>
                          <label style={{ flex: 1, cursor: 'pointer' }}>
                              <input type="radio" name="tipe" checked={formData.tipe === 'keluar'} onChange={() => setFormData({...formData, tipe: 'keluar'})} style={{ display: 'none' }} />
                              <div style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.9rem', background: formData.tipe === 'keluar' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', color: formData.tipe === 'keluar' ? '#ef4444' : '#666', border: formData.tipe === 'keluar' ? '1px solid #ef4444' : '1px solid transparent', transition: 'all 0.2s' }}>Pengeluaran</div>
                          </label>
                      </div>
                      <div><label style={labelStyle}>Nominal (Rp)</label><input type="text" inputMode="numeric" placeholder="0" value={displayNominal} onChange={handleNominalChange} style={{ ...inputStyle, fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }} required /></div>
                      <div><label style={labelStyle}>Keterangan</label><input type="text" placeholder="Contoh: Iuran Warga" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} style={inputStyle} required /></div>
                      <div><label style={labelStyle}>Tanggal Transaksi</label><input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} style={inputStyle} required /></div>
                      <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: isSubmitting ? '#444' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', color: isSubmitting ? '#888' : '#000', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>{isSubmitting ? <><LuLoader className="animate-spin"/> Menyimpan...</> : <><LuSave /> Simpan Transaksi</>}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

// --- KOMPONEN KARTU ---
const CardStat: React.FC<CardStatProps> = ({ icon, label, value, sub, color, bg, isCurrency = false }) => (
    <div style={{ background: "rgba(15,15,15,0.8)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: '12px', padding: '1rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: '0.65rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{label}</div><div style={{ color: color, fontSize:'0.9rem', background: bg, padding:'5px', borderRadius:'6px', display:'flex' }}>{icon}</div></div>
        <div style={{ fontSize: isCurrency ? 'clamp(0.9rem, 4vw, 1.5rem)' : 'clamp(1.2rem, 4vw, 2rem)', fontWeight: '700', color: '#fff', lineHeight: 1.2, marginTop:'0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: color, opacity: 0.9, display:'flex', alignItems:'center', gap:'4px', fontWeight:'500' }}><div style={{width:5, height:5, borderRadius:'50%', background:color, boxShadow: `0 0 5px ${color}`}}></div> {sub}</div>
    </div>
);