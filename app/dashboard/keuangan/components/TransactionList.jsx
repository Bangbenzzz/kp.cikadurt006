"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { deleteDoc, doc } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { 
  FaTrash, FaHistory, FaPen, FaChevronLeft, FaChevronRight, 
  FaFileDownload, FaFilePdf, FaFileExcel, FaAngleDown, FaFilter, FaExclamationTriangle
} from "react-icons/fa";

export default function TransactionList({ transaksi, loading, onSuccess, onError, onEdit }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // --- STATE MODAL HAPUS ---
  const [deleteData, setDeleteData] = useState(null); 
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE FILTER ---
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear());

  const yearsList = useMemo(() => {
      const startYear = 2023; 
      const currentYear = new Date().getFullYear();
      const endYear = currentYear + 1; 
      const years = [];
      for (let y = startYear; y <= endYear; y++) { years.push(y); }
      return years;
  }, []);

  // --- FILTER & PAGINATION ---
  const filteredData = useMemo(() => {
      return transaksi.filter(t => {
          const date = new Date(t.tanggal);
          const matchMonth = filterBulan === 'semua' || date.getMonth() + 1 === parseInt(filterBulan);
          const matchYear = filterTahun === 'semua' || date.getFullYear() === parseInt(filterTahun);
          return matchMonth && matchYear;
      }).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); 
  }, [transaksi, filterBulan, filterTahun]);

  const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");
  const formatTableDate = (dateString) => { 
      if (!dateString) return '-'; 
      const date = new Date(dateString); if (isNaN(date.getTime())) return dateString; 
      const day = String(date.getDate()).padStart(2, '0'); 
      const month = String(date.getMonth() + 1).padStart(2, '0'); 
      const year = date.getFullYear(); return `${day}/${month}/${year}`; 
  };

  useEffect(() => {
    const handleClickOutside = (event) => { if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setShowExportMenu(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HAPUS DATA ---
  const openDeleteModal = (item) => { setDeleteData(item); };
  const confirmDelete = async () => {
    if (!deleteData) return;
    setIsDeleting(true);
    try { 
        await deleteDoc(doc(db, "keuangan", deleteData.id)); 
        onSuccess("Data berhasil dihapus"); 
        setDeleteData(null); 
    } catch (error) { console.error(error); onError("Gagal menghapus data"); } 
    finally { setIsDeleting(false); }
  };

  // --- EXPORT PDF (SAMA SEPERTI SEBELUMNYA) ---
  const handleExportPDF = async () => {
    if (!filteredData.length) return onError("Data kosong (Cek filter anda)");
    onSuccess("Mengunduh PDF...");
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const logo = new Image(); logo.src = '/logo-rt.png';

    let totalMasuk = 0; let totalKeluar = 0;
    filteredData.forEach(t => { if(t.tipe === 'masuk') totalMasuk += Number(t.nominal); else totalKeluar += Number(t.nominal); });
    const sisaSaldo = totalMasuk - totalKeluar;

    logo.onload = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; const pageHeight = doc.internal.pageSize.height;

        doc.addImage(logo, 'PNG', 15, 10, 20, 20); 
        doc.setFont("times", "bold"); 
        doc.setFontSize(14); doc.text("KETUA RT. 02 RW. 19", pageWidth / 2, 14, { align: 'center' });
        doc.text("DESA DAYEUH", pageWidth / 2, 20, { align: 'center' });
        doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 26, { align: 'center' });
        doc.setFont("times", "normal"); doc.setFontSize(9); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 33, { align: 'center' });
        doc.setLineWidth(0.5); doc.line(15, 38, pageWidth - 15, 38);

        doc.setFont("times", "bold"); doc.setFontSize(12); doc.text("LAPORAN KEUANGAN", pageWidth / 2, 46, { align: 'center' });
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        const periodeInfo = filterBulan !== 'semua' ? `Periode: ${new Date(2024, filterBulan - 1).toLocaleString('id-ID', { month: 'long' })} ${filterTahun}` : `Periode: Tahun ${filterTahun}`;
        doc.text(periodeInfo, pageWidth / 2, 51, { align: 'center' });

        doc.setDrawColor(200); doc.setFillColor(250, 250, 250); doc.rect(15, 56, pageWidth - 30, 18, 'FD'); 
        doc.setFontSize(9); doc.setTextColor(50);
        doc.text("Total Pemasukan:", 20, 62); doc.text("Total Pengeluaran:", 20, 68);
        doc.setFont("helvetica", "bold"); doc.text("Sisa Saldo:", 110, 65); 
        doc.setFont("courier", "bold");
        doc.setTextColor(0, 128, 0); doc.text(formatRp(totalMasuk), 65, 62, {align:'right'});
        doc.setTextColor(180, 0, 0); doc.text(formatRp(totalKeluar), 65, 68, {align:'right'});
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text(formatRp(sisaSaldo), pageWidth - 20, 65, {align:'right'});

        const sortedForPdf = [...filteredData].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)); 
        const tableColumn = ["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"];
        const tableRows = sortedForPdf.map((t, index) => [ index + 1, formatTableDate(t.tanggal), t.keterangan, t.tipe === 'masuk' ? Number(t.nominal).toLocaleString('id-ID') : '-', t.tipe === 'keluar' ? Number(t.nominal).toLocaleString('id-ID') : '-' ]);

        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 80, theme: 'grid',
            styles: { fontSize: 9, cellPadding: 1.5, valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 32, halign: 'right' } },
            alternateRowStyles: { fillColor: [245, 245, 245] }, margin: { left: 15, right: 15 }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
            doc.setFontSize(8); doc.setTextColor(150);
            doc.line(15, pageHeight - 10, pageWidth - 15, pageHeight - 10);
            doc.text(`Dicetak: ${exportTime}`, pageWidth - 15, pageHeight - 6, { align: 'right' }); 
            doc.text("Sistem Administrasi RT Kp. Cikadu", 15, pageHeight - 6);
        }
        doc.save(`Laporan_Keuangan_RT02_${new Date().toISOString().slice(0,10)}.pdf`);
    };
  };

  const handleExportExcel = async () => {
    if (!filteredData.length) return onError("Data kosong");
    onSuccess("Mengunduh Excel...");
    const ExcelJS = (await import("exceljs")).default;
    const sortedData = [...filteredData].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');
    const kopRows = [ ["KETUA RT. 02 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"] ];
    kopRows.forEach((row, index) => { const r = worksheet.getRow(index + 1); r.values = [row[0]]; worksheet.mergeCells(`A${index + 1}:E${index + 1}`); r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; r.getCell(1).font = { bold: true, size: index < 3 ? 14 : 10, name: 'Times New Roman' }; });
    worksheet.getRow(6).values = [`LAPORAN KEUANGAN - ${filterTahun}`]; worksheet.mergeCells('A6:E6'); worksheet.getCell('A6').alignment = { horizontal: 'center' }; worksheet.getCell('A6').font = { bold: true, size: 12 };
    const headerRow = worksheet.getRow(8);
    headerRow.values = ["No", "Tanggal", "Uraian / Keterangan", "Pemasukan", "Pengeluaran"];
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; });
    sortedData.forEach((t, index) => {
        const row = worksheet.addRow([ index + 1, formatTableDate(t.tanggal), t.keterangan, t.tipe === 'masuk' ? Number(t.nominal) : 0, t.tipe === 'keluar' ? Number(t.nominal) : 0 ]);
        row.eachCell((cell, col) => { cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; if (col === 4 || col === 5) cell.numFmt = '#,##0'; });
    });
    worksheet.columns = [{width: 5}, {width: 15}, {width: 40}, {width: 20}, {width: 20}];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Laporan_${filterBulan}-${filterTahun}.xlsx`; a.click();
  };

  return (
    <div style={{ background: "rgba(15,15,15,0.6)", border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', flex: 1 }}>
        <style jsx>{` 
            .dropdown-item:hover { background: rgba(0, 234, 255, 0.15) !important; color: #fff !important; } 
            select { background: #222; color: #fff; border: 1px solid #444; padding: 6px 10px; borderRadius: 6px; outline: none; cursor: pointer; } 
            
            /* CSS RESPONSIVE TOMBOL TENGAH DI HP */
            .controls-wrapper { display: flex; gap: 0.5rem; flex-wrap: wrap; }
            @media (max-width: 768px) {
                .controls-wrapper { 
                    width: 100%; 
                    justify-content: center; /* Tombol ke tengah */
                    margin-top: 10px;
                }
                .export-container {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                }
            }
        `}</style>
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap: 'wrap', gap:'1rem'}}>
              <h3 style={{ margin: 0, color: '#eee', fontSize: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}><FaHistory color='#f59e0b'/> Riwayat Mutasi</h3>
              
              <div className="controls-wrapper">
                  {/* FILTER BULAN & TAHUN */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius:'8px' }}>
                      <FaFilter color="#888" size={12}/>
                      <select value={filterBulan} onChange={(e) => {setFilterBulan(e.target.value); setCurrentPage(1);}}>
                          <option value="semua">Semua Bulan</option>
                          {[...Array(12)].map((_,i) => <option key={i} value={i+1}>{new Date(2024, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                      </select>
                      <select value={filterTahun} onChange={(e) => {setFilterTahun(e.target.value); setCurrentPage(1);}}>
                          <option value="semua">Semua Tahun</option>
                          {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                  </div>

                  {/* EXPORT BUTTON */}
                  <div className="export-container" style={{position: 'relative'}} ref={exportMenuRef}>
                      <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight:'600' }} className="btn-hover">
                          <FaFileDownload /> Export <FaAngleDown />
                      </button>
                      {showExportMenu && (
                          <div style={{ position: 'absolute', right: 0, top: '110%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', width: '170px', zIndex: 10, boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                              <button onClick={handleExportPDF} className="dropdown-item" style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#ccc', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #333' }}>
                                  <FaFilePdf style={{color:'#ef4444'}}/> Download PDF
                              </button>
                              <button onClick={handleExportExcel} className="dropdown-item" style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#ccc', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}>
                                  <FaFileExcel style={{color:'#10b981'}}/> Download Excel
                              </button>
                          </div>
                      )}
                  </div>
              </div>
        </div>

        {/* LIST DATA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', minHeight:'300px' }}>
              {loading ? <div style={{textAlign:'center', padding:'2rem', color:'#666'}}>Memuat...</div> : 
              paginatedData.length === 0 ? <div style={{textAlign:'center', padding:'2rem', color:'#666', border:'1px dashed #333', borderRadius:'8px'}}>Data tidak ditemukan pada periode ini.</div> :
              paginatedData.map((t) => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: 'rgba(255,255,255,0.02)', padding:'10px 15px', borderRadius:'10px', borderLeft: t.tipe === 'masuk' ? '4px solid #00ff88' : '4px solid #ff0055' }}>
                      <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontWeight: '600', fontSize:'0.9rem' }}>{t.keterangan}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666', marginTop:'2px' }}>{formatTableDate(t.tanggal)}</div>
                      </div>
                      <div style={{ textAlign:'right', marginRight:'1rem', color: t.tipe === 'masuk' ? '#00ff88' : '#ff0055', fontWeight:'bold' }}>{t.tipe === 'masuk' ? '+' : '-'} {formatRp(t.nominal)}</div>
                      
                      <div style={{display:'flex', gap:'8px'}}>
                        <button onClick={() => onEdit(t)} style={{ background:'none', border:'none', color:'#00aaff', cursor:'pointer' }} title="Edit">
                            <FaPen size={14} />
                        </button>
                        <button onClick={() => openDeleteModal(t)} style={{ background:'none', border:'none', color:'#ff4d4f', cursor:'pointer' }} title="Hapus">
                            <FaTrash size={14} />
                        </button>
                      </div>
                  </div>
              ))}
        </div>
        
        {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:'1rem', marginTop:'1rem' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{background:'#333', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', opacity: currentPage===1?0.5:1}}><FaChevronLeft/></button>
                <span style={{color:'#888', fontSize:'0.9rem', display:'flex', alignItems:'center'}}>Halaman {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{background:'#333', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', opacity: currentPage===totalPages?0.5:1}}><FaChevronRight/></button>
            </div>
        )}

        {/* --- CUSTOM DELETE MODAL (DIPERKECIL UKURANNYA) --- */}
        {deleteData && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
                <div style={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #333', 
                    borderRadius: '12px', 
                    padding: '1.5rem', /* Padding diperkecil */
                    width: '90%', 
                    maxWidth: '320px', /* Lebar diperkecil */
                    textAlign: 'center', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
                }}>
                    <div style={{ color: '#ff4d4f', fontSize: '2.5rem', marginBottom: '0.8rem' }}><FaExclamationTriangle /></div>
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem', marginTop:0 }}>Konfirmasi Hapus</h3>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight:'1.4' }}>
                        Apakah Anda yakin ingin menghapus transaksi ini?<br/>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>"{deleteData.keterangan}"</span>
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
                        <button onClick={() => setDeleteData(null)} style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize:'0.85rem' }} disabled={isDeleting}>
                            Batal
                        </button>
                        <button onClick={confirmDelete} style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize:'0.85rem' }} disabled={isDeleting}>
                            {isDeleting ? '...' : 'Ya, Hapus'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}