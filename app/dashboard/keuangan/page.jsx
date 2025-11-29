"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, updateDoc } from "@/lib/firebase"; 
import { 
  LuWallet, LuArrowUp, LuArrowDown, LuPlus, LuFileText, LuX, LuSave, LuLoader, LuDownload, LuFilter,
  LuPencil, LuTrash2, LuTriangleAlert, LuCircleCheck 
} from "react-icons/lu";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from 'sweetalert2';

// --- 1. NUCLEAR CONSOLE PATCH ---
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (/defaultProps/.test(args[0])) return;
    originalError.call(console, ...args);
  };
}

// --- HELPER FUNCTIONS ---
const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");
const formatRpNoSymbol = (num) => Number(num).toLocaleString("id-ID");
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatNumberDots = (num) => {
    return num.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getBase64ImageFromURL = (url) => {
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

// --- STYLES (Input Form) ---
const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none', marginBottom: '1rem'
};

const labelStyle = {
    display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.85rem', fontWeight: '500'
};

const selectStyle = {
    width: '100%', padding: '12px', background: '#222', border: '1px solid #444',
    borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', marginBottom: '1rem'
};

export default function KeuanganPage() {
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State Form Transaksi
  const [editId, setEditId] = useState(null); 
  const [formData, setFormData] = useState({
      keterangan: '',
      tipe: 'masuk',
      date: new Date().toISOString().split('T')[0],
  });
  const [displayNominal, setDisplayNominal] = useState('');
  const [realNominal, setRealNominal] = useState(0);

  // State Export Filter
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportType, setExportType] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); 
  const [selectedQuarter, setSelectedQuarter] = useState(1); 

  useEffect(() => {
    const q = query(collection(db, 'keuangan'), orderBy('tanggal', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransaksi(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- STATS CALCULATION (MEMOIZED) ---
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

  // --- HANDLERS (INPUT) ---
  const handleNominalChange = (e) => {
      const value = e.target.value;
      const numericString = value.replace(/\./g, '').replace(/[^0-9]/g, '');
      const numberValue = parseInt(numericString || '0', 10);
      setRealNominal(numberValue);
      setDisplayNominal(numericString === '' ? '' : formatNumberDots(numericString));
  };

  const handleOpenAdd = () => {
      setEditId(null); 
      setFormData({ keterangan: '', tipe: 'masuk', date: new Date().toISOString().split('T')[0] });
      setDisplayNominal('');
      setRealNominal(0);
      setShowModal(true);
  };

  const handleOpenEdit = (t) => {
      setEditId(t.id);
      setFormData({ 
          keterangan: t.keterangan, 
          tipe: t.tipe, 
          date: t.tanggal 
      });
      setRealNominal(t.nominal);
      setDisplayNominal(formatNumberDots(t.nominal.toString()));
      setShowModal(true);
  };

  // --- FUNGSI TOAST NOTIFIKASI KECIL & RAPI ---
  const showToast = (message) => {
      const Toast = Swal.mixin({
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          didOpen: (toast) => {
              toast.addEventListener('mouseenter', Swal.stopTimer)
              toast.addEventListener('mouseleave', Swal.resumeTimer)
          }
      });

      Toast.fire({
          icon: undefined, 
          background: '#161616',
          html: `
            <div style="display: flex; align-items: center; gap: 10px; font-family: sans-serif;">
                <div style="width: 22px; height: 22px; background: rgba(0, 255, 136, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span style="color: #fff; font-size: 0.85rem; font-weight: 600;">${message}</span>
            </div>
          `,
          customClass: {
              popup: 'clean-toast-popup'
          }
      });
  };

  const handleDelete = async (id) => {
      const result = await Swal.fire({
          title: 'Hapus?',
          text: "Hapus data ini?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444', 
          cancelButtonColor: '#333', 
          confirmButtonText: 'Hapus',
          cancelButtonText: 'Batal',
          background: '#1a1a1a', 
          color: '#fff',
          iconColor: '#f59e0b',
          reverseButtons: true,
          width: '300px',
      });

      if (result.isConfirmed) {
          try {
              await deleteDoc(doc(db, 'keuangan', id));
              showToast('Data berhasil dihapus');
          } catch (error) {
              console.error(error);
          }
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.keterangan || realNominal <= 0) return; 

      setIsSubmitting(true);
      try {
          if (editId) {
              await updateDoc(doc(db, 'keuangan', editId), {
                  keterangan: formData.keterangan, 
                  nominal: realNominal, 
                  tipe: formData.tipe,
                  tanggal: formData.date
              });
              showToast('Transaksi berhasil diperbarui');
          } else {
              await addDoc(collection(db, 'keuangan'), {
                  keterangan: formData.keterangan, nominal: realNominal, tipe: formData.tipe,
                  tanggal: formData.date, createdAt: new Date().toISOString()
              });
              showToast('Transaksi berhasil disimpan');
          }
          handleOpenAdd(); 
          setShowModal(false);
      } catch (error) { 
          console.error(error); 
      } 
      finally { setIsSubmitting(false); }
  };

  // --- EXPORT LOGIC ---
  const getFilteredData = () => {
    return transaksi.filter(t => {
        const d = new Date(t.tanggal);
        const y = d.getFullYear();
        const m = d.getMonth();

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

  const processExport = async () => {
    const dataToExport = getFilteredData();
    const periodTitle = getExportTitle();

    if (dataToExport.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Tidak ada data',
            text: 'Tidak ada transaksi untuk periode yang dipilih.',
            background: '#1a1a1a', color: '#fff', confirmButtonColor: '#333'
        });
        return; 
    }

    // Hitung Total Masuk/Keluar HANYA untuk periode yang dipilih
    let sumMasukPeriode = 0;
    let sumKeluarPeriode = 0;
    dataToExport.forEach(t => {
        if (t.tipe === 'masuk') sumMasukPeriode += Number(t.nominal);
        else sumKeluarPeriode += Number(t.nominal);
    });
    
    // Ambil Total Saldo Akumulasi (Keseluruhan)
    const totalSaldoSaatIni = stats.totalSaldo; 

    if (exportFormat === 'excel') {
        // ... (Kode Excel tidak berubah, tetap sama seperti sebelumnya) ...
        const headerData = [
            ["KETUA RT. 02 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"],
            ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"], [],
            ["LAPORAN KEUANGAN"], [`Periode: ${periodTitle}`], [],
        ];
        
        const summaryData = [
            ["Total Pemasukan (Periode):", formatRp(sumMasukPeriode), "", "TOTAL SALDO SAAT INI:", formatRp(totalSaldoSaatIni)],
            ["Total Pengeluaran (Periode):", formatRp(sumKeluarPeriode), "", "", ""], []
        ];
        const tableHeader = ["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"];
        const tableBody = dataToExport.map((t, index) => [
            (index + 1).toString(),
            formatDate(t.tanggal), 
            t.keterangan,
            t.tipe === 'masuk' ? formatRpNoSymbol(t.nominal) : "-",
            t.tipe === 'keluar' ? formatRpNoSymbol(t.nominal) : "-"
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([...headerData, ...summaryData, tableHeader, ...tableBody]);
        worksheet['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
        XLSX.writeFile(workbook, `Laporan_${periodTitle.replace(/ /g, '_')}.xlsx`);

        showToast('File Excel berhasil diunduh'); 

    } else {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        try {
            const imgData = await getBase64ImageFromURL('/logo-rt.png'); 
            doc.addImage(imgData, 'PNG', 14, 10, 20, 20);
        } catch (e) { console.warn("Logo missing"); }

        // --- KOP SURAT ---
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("KETUA RT. 02 RW. 19", pageWidth / 2, 14, { align: "center" });
        doc.text("DESA DAYEUH", pageWidth / 2, 19, { align: "center" });
        doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 24, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 29, { align: "center" });
        doc.setLineWidth(0.5); doc.line(14, 32, pageWidth - 14, 32);

        // --- JUDUL ---
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("LAPORAN KEUANGAN", pageWidth / 2, 40, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text(`Periode : ${periodTitle}`, pageWidth / 2, 45, { align: "center" });

        // --- KOTAK SUMMARY (LAYOUT BARU) ---
        const startYSummary = 50;
        doc.setDrawColor(200); doc.setFillColor(250);
        doc.roundedRect(14, startYSummary, pageWidth - 28, 25, 1, 1, 'FD'); 
        
        // ==========================================
        // BAGIAN KIRI: PEMASUKAN & PENGELUARAN
        // ==========================================
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50);
        
        // 1. Teks Label (HURUF KAPITAL)
        doc.text("TOTAL PEMASUKAN", 20, startYSummary + 9);
        doc.text("TOTAL PENGELUARAN", 20, startYSummary + 18);

        // 2. Titik Dua (Geser dikit ke 62 karena tulisan kapital lebih lebar)
        doc.text(":", 62, startYSummary + 9);
        doc.text(":", 62, startYSummary + 18);

        // 3. Nominal (Font Size 11 - Bold)
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 150, 0); doc.text(formatRp(sumMasukPeriode), 65, startYSummary + 9);
        doc.setTextColor(200, 0, 0); doc.text(formatRp(sumKeluarPeriode), 65, startYSummary + 18);

        // ==========================================
        // BAGIAN KANAN: TOTAL SALDO SAAT INI
        // ==========================================
        
        const saldoText = formatRp(totalSaldoSaatIni);
        const rightLimit = pageWidth - 20; // Batas kanan kertas

        // 1. Render Angka Nominal (Font Size 11 - SAMA SEPERTI KIRI)
        doc.setFontSize(11); 
        doc.setFont("helvetica", "bold"); 
        doc.setTextColor(0, 0, 0); // Warna Hitam
        doc.text(saldoText, rightLimit, startYSummary + 13, { align: "right" });

        // 2. Hitung lebar angkanya (Logic agar titik dua nempel rapi)
        const saldoWidth = doc.getTextWidth(saldoText);
        const colonX = rightLimit - saldoWidth - 3; 

        // 3. Render Titik Dua & Label (Font Size 10 - SAMA SEPERTI KIRI)
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal"); 
        doc.setTextColor(50);

        // Titik Dua
        doc.text(":", colonX, startYSummary + 13);

        // Label KAPITAL
        doc.text("TOTAL SALDO SAAT INI", colonX - 2, startYSummary + 13, { align: "right" });

        // --- TABEL ---
        const tableRows = dataToExport.map((t, index) => [
            (index + 1).toString(), formatDate(t.tanggal), t.keterangan,
            t.tipe === 'masuk' ? formatRpNoSymbol(t.nominal) : "-",
            t.tipe === 'keluar' ? formatRpNoSymbol(t.nominal) : "-"
        ]);

        autoTable(doc, {
            head: [["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"]],
            body: tableRows,
            startY: startYSummary + 30,
            theme: 'striped',
            headStyles: { fillColor: [66, 103, 178], textColor: 255, fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9, textColor: 50 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'left' }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setDrawColor(200); doc.setLineWidth(0.5);
                doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
                doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
                doc.text("Sistem Administrasi RT Kp. Cikadu", 14, pageHeight - 10);
                doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
            }
        });
        doc.save(`Laporan_${periodTitle.replace(/ /g, '_')}.pdf`);
        
        showToast('File PDF berhasil diunduh'); 
    }
    setShowExportModal(false);
  };

  // Loading text
  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#00eaff', fontSize:'0.8rem'}}>Memuat Data...</div>;

  const availableYears = Array.from(new Set(transaksi.map(t => new Date(t.tanggal).getFullYear()))).sort((a,b)=>b-a);
  if (!availableYears.includes(new Date().getFullYear())) availableYears.unshift(new Date().getFullYear());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* CSS GLOBAL UTAMA - TOAST FIXED & CLEAN */}
      <style jsx global>{`
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
          @media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; } }
          
          .custom-scroll {
              -webkit-overflow-scrolling: touch; 
              overscroll-behavior-y: contain; 
              will-change: transform; 
          }
          .custom-scroll::-webkit-scrollbar { width: 6px; }
          .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

          .neon-card {
            position: relative;
            background: #111; 
            border-radius: 16px;
            z-index: 1;
            border: 1px solid rgba(255,255,255,0.08); 
          }
          .neon-card::before { display: none; }
          
          .card-inner {
            background: #111; 
            border-radius: 16px;
            padding: 1.2rem;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 2;
          }

          @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
          }
          
          @keyframes dotBlink {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.3; transform: scale(0.8); }
              100% { opacity: 1; transform: scale(1); }
          }

          /* --- CSS RESET & FIX UNTUK SWEETALERT TOAST --- */
          div:where(.swal2-container) { z-index: 9999 !important; }
          
          /* Style Container Toast agar tidak terlalu lebar & padding pas */
          div:where(.swal2-container).swal2-top > .swal2-popup.clean-toast-popup {
              padding: 8px 16px !important;
              width: auto !important;
              max-width: 350px;
              border-radius: 50px !important;
              background: #161616 !important;
              border: 1px solid rgba(255,255,255,0.15) !important;
              box-shadow: 0 8px 20px rgba(0,0,0,0.5) !important;
              margin-top: 1.5rem !important;
              display: flex !important;
              align-items: center !important;
          }

          /* Pastikan HTML container tidak menambah margin aneh */
          div:where(.swal2-popup).clean-toast-popup .swal2-html-container {
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              text-align: left !important;
          }

          /* Hilangkan Icon Bawaan jika masih muncul (Safety Net) */
          div:where(.swal2-popup).clean-toast-popup .swal2-icon {
              display: none !important;
          }

          /* Warna Progress Bar Toast */
          div:where(.swal2-timer-progress-bar) { background: #00ff88 !important; height: 3px !important; bottom: 0 !important; border-radius: 0 0 50px 50px; }

          /* Style Modal Biasa (Delete Confirm) */
          div:where(.swal2-popup):not(.clean-toast-popup) .swal2-icon {
              width: 3.5em !important; height: 3.5em !important; margin-top: 0.5rem !important;
          }

          .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <div>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color:'#f59e0b', fontFamily: 'monospace', display:'flex', alignItems:'center', gap:'10px' }}><LuWallet /> Laporan Keuangan</h1>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>Rekapitulasi Kas & Transaksi Warga</p>
          </div>
      </div>

      {/* STATS - DENGAN DELAY ANIMASI AGAR TIDAK BARENG */}
      <div className="stat-grid">
          <CardStat delay="0s" icon={<LuWallet />} label="Total Saldo" value={formatRp(stats.totalSaldo)} sub="TOTAL KAS" color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" isCurrency={true}/>
          <CardStat delay="0.5s" icon={<LuArrowUp />} label="Pemasukan" value={formatRp(stats.bulanIniMasuk)} sub="BULAN INI" color="#00ff88" bg="rgba(0, 255, 136, 0.1)" isCurrency={true}/>
          <CardStat delay="0.9s" icon={<LuArrowDown />} label="Pengeluaran" value={formatRp(stats.bulanIniKeluar)} sub="BULAN INI" color="#ef4444" bg="rgba(239, 68, 68, 0.1)" isCurrency={true}/>
          <CardStat delay="0.12s" icon={<LuFileText />} label="Transaksi" value={stats.totalTransaksi} sub="TOTAL DATA" color="#00eaff" bg="rgba(0, 234, 255, 0.1)"/>
      </div>

      {/* --- MONTHLY HEALTH BAR --- */}
      <MonthlyHealthBar masuk={stats.bulanIniMasuk} keluar={stats.bulanIniKeluar} />

      {/* LIST RIWAYAT */}
      <div className="neon-card" style={{'--c1': '#444', '--c2': '#666'}}>
          <div className="card-inner" style={{ minHeight: '400px', height: 'calc(100vh - 300px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight:'600' }}>Riwayat Transaksi</h3>
                    <div style={{ display: 'flex', gap: '0.8rem', marginLeft: 'auto' }}>
                        <button onClick={() => setShowExportModal(true)} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                            <LuDownload /> Export Laporan
                        </button>
                        <button onClick={handleOpenAdd} style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', color: '#000', borderRadius: '6px', padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700', display:'flex', alignItems:'center', gap:'6px', boxShadow: '0 4px 12px rgba(0, 255, 136, 0.3)' }}>
                          <LuPlus size="16"/> Tambah
                        </button>
                    </div>
                </div>
                
                <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                    {transaksi.length > 0 ? transaksi.slice(0, 100).map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', position: 'relative' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, background: t.tipe === 'masuk' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${t.tipe === 'masuk' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, color: t.tipe === 'masuk' ? '#00ff88' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                {t.tipe === 'masuk' ? <LuArrowUp /> : <LuArrowDown />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.85rem', marginBottom:'2px' }}>{t.keterangan}</div>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>{formatDate(t.tanggal)}</div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                 <div style={{ fontWeight: '700', color: t.tipe === 'masuk' ? '#00ff88' : '#ef4444', fontSize: '0.85rem' }}>
                                    {t.tipe === 'masuk' ? '+' : '-'}{formatRp(t.nominal).replace('Rp ', '')}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => handleOpenEdit(t)} title="Edit Data" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <LuPencil size="12" />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} title="Hapus Data" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <LuTrash2 size="12" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.9rem' }}>Belum ada data transaksi.</div>}
                    
                    {transaksi.length > 100 && (
                        <div style={{textAlign:'center', padding:'1rem', fontSize:'0.75rem', color:'#555', borderTop:'1px solid rgba(255,255,255,0.05)', marginTop:'1rem'}}>
                            *Hanya menampilkan 100 data terbaru.<br/>
                            Gunakan fitur <b>Export Laporan</b> untuk melihat data lengkap.
                        </div>
                    )}
                </div>
          </div>
      </div>

      {/* --- MODALS --- */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowExportModal(false)}>
            <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#00eaff', fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'10px' }}><LuFilter/> Filter Export</h3>
                    <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><LuX size="24"/></button>
                </div>
                <label style={labelStyle}>Format Dokumen</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                     <button onClick={() => setExportFormat('pdf')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: exportFormat === 'pdf' ? '1px solid #ff4d4f' : '1px solid #333', background: exportFormat === 'pdf' ? 'rgba(255, 77, 79, 0.1)' : 'transparent', color: exportFormat === 'pdf' ? '#ff4d4f' : '#666', fontWeight: 'bold', cursor: 'pointer', transition:'0.2s' }}>PDF</button>
                     <button onClick={() => setExportFormat('excel')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: exportFormat === 'excel' ? '1px solid #00ff88' : '1px solid #333', background: exportFormat === 'excel' ? 'rgba(0, 255, 136, 0.1)' : 'transparent', color: exportFormat === 'excel' ? '#00ff88' : '#666', fontWeight: 'bold', cursor: 'pointer', transition:'0.2s' }}>Excel</button>
                </div>
                <label style={labelStyle}>Pilih Periode Laporan</label>
                <select value={exportType} onChange={(e) => setExportType(e.target.value)} style={selectStyle}>
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
                                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => <option key={i} value={i}>{m}</option>)}
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

      {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowModal(false)}>
              <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem' }}>{editId ? 'Edit Transaksi' : 'Tambah Transaksi'}</h3>
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
                      <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: isSubmitting ? '#444' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', color: isSubmitting ? '#888' : '#000', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
                        {isSubmitting ? <><LuLoader className="animate-spin"/> Menyimpan...</> : <><LuSave /> {editId ? 'Update Transaksi' : 'Simpan Transaksi'}</>}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

const CardStat = ({ icon, label, value, sub, color, bg, isCurrency = false, delay = "0s" }) => {
    let c2 = color;
    if (color === '#f59e0b') c2 = '#b45309'; 
    else if (color === '#00ff88') c2 = '#059669'; 
    else if (color === '#ef4444') c2 = '#b91c1c'; 
    else if (color === '#00eaff') c2 = '#0077ff'; 

    return (
        <div className="neon-card" style={{'--c1': color, '--c2': c2}}>
            <div className="card-inner">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                        {label}
                    </div>
                    <div style={{ color: color, fontSize:'0.9rem', background: 'rgba(255,255,255,0.05)', padding:'5px', borderRadius:'6px', display:'flex' }}>
                        {icon}
                    </div>
                </div>
                <div style={{ fontSize: isCurrency ? 'clamp(0.9rem, 4vw, 1.5rem)' : 'clamp(1.2rem, 4vw, 2rem)', fontWeight: '700', color: '#fff', lineHeight: 1.2, marginTop:'0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.65rem', color: color, opacity: 0.9, display:'flex', alignItems:'center', gap:'4px', fontWeight:'500', marginTop:'auto', paddingTop:'0.5rem' }}>
                    <div style={{
                        width: 6, // Sedikit diperbesar
                        height: 6, 
                        borderRadius: '50%', 
                        background: color, 
                        boxShadow: `0 0 8px ${color}`,
                        animation: `dotBlink 0.6s ease-in-out infinite`,
                        animationDelay: delay // DELAY DITERAPKAN DI SINI
                    }}></div> 
                    {sub}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: MONTHLY HEALTH BAR ---
const MonthlyHealthBar = ({ masuk, keluar }) => {
    const percentage = masuk > 0 ? (keluar / masuk) * 100 : (keluar > 0 ? 100 : 0);
    const isDanger = keluar > masuk;
    
    const barColor = isDanger ? '#ef4444' : (percentage > 75 ? '#f59e0b' : '#00ff88');
    const barColor2 = isDanger ? '#b91c1c' : (percentage > 75 ? '#b45309' : '#059669');

    const barWidth = Math.min(percentage, 100);

    return (
        <div className="neon-card" style={{'--c1': barColor, '--c2': barColor2, marginTop:'0.5rem'}}>
            <div className="card-inner" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>
                    <div style={{ color: '#fff' }}>Kesehatan Anggaran Bulan Ini</div>
                    <div style={{ color: barColor, display:'flex', alignItems:'center', gap:'6px' }}>
                        {isDanger ? <LuTriangleAlert/> : <LuCircleCheck/>}
                        {isDanger ? 'Defisit Anggaran!' : `${percentage.toFixed(1)}%`}
                    </div>
                </div>

                <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${barColor}, ${barColor2})`,
                        borderRadius: '50px',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: `0 0 10px ${barColor}`
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s infinite linear'
                        }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};