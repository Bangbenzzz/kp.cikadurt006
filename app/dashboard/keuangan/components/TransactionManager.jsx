"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

// Library Export
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { 
  FaTrash, FaPlus, FaSave, FaHistory, FaPen, FaTimes, 
  FaCheckCircle, FaExclamationCircle, FaChevronLeft, FaChevronRight,
  FaFileDownload, FaFilePdf, FaFileExcel, FaAngleDown 
} from "react-icons/fa";
import { LuLoader } from "react-icons/lu"; 

export default function TransactionManager({ transaksi, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // State Form
  const [tipe, setTipe] = useState("masuk");
  const [nominal, setNominal] = useState(""); 
  const [displayNominal, setDisplayNominal] = useState(""); 
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // State Lainnya
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const [notification, setNotification] = useState(null);

  // --- LOGIKA PAGINASI ---
  const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return transaksi.slice(startIndex, endIndex);
  }, [transaksi, currentPage]);
  
  const totalPages = Math.ceil(transaksi.length / itemsPerPage);

  // --- HELPER FUNCTIONS ---
  const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");
  
  const showNotification = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const handleNominalChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setNominal(rawValue);
    if (rawValue === "") setDisplayNominal("");
    else setDisplayNominal(Number(rawValue).toLocaleString("id-ID"));
  };

  // --- HANDLERS ---
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
            setShowExportMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = (item) => {
      setShowForm(true);
      setEditingId(item.id);
      setTipe(item.tipe);
      setNominal(item.nominal);
      setDisplayNominal(Number(item.nominal).toLocaleString("id-ID"));
      setKeterangan(item.keterangan);
      setTanggal(item.tanggal);
      window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setTipe("masuk");
      setNominal("");
      setDisplayNominal("");
      setKeterangan("");
      setTanggal(new Date().toISOString().split('T')[0]);
      setShowForm(false);
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!nominal || !keterangan) return showNotification("Mohon isi nominal dan keterangan!", "error");

    setSubmitting(true);
    try {
      const dataPayload = {
        tipe, nominal: Number(nominal), keterangan, tanggal,
        ...(editingId ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
      };

      if (editingId) {
          await updateDoc(doc(db, "keuangan", editingId), dataPayload);
          showNotification("Data berhasil diperbarui!");
      } else {
          await addDoc(collection(db, "keuangan"), dataPayload);
          showNotification("Transaksi berhasil disimpan!");
      }
      handleCancelEdit();
    } catch (err) {
      console.error(err);
      showNotification("Gagal menyimpan data", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
        try {
            await deleteDoc(doc(db, "keuangan", id));
            if (editingId === id) handleCancelEdit();
            showNotification("Data berhasil dihapus");
            if (paginatedData.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        } catch (error) {
            showNotification("Gagal menghapus data", "error");
        }
    }
  };

  // --- EXPORT ---
  const handleExportExcel = () => {
      const dataToExport = transaksi.map((t, index) => ({
          No: index + 1, Tanggal: t.tanggal, Keterangan: t.keterangan, 
          Tipe: t.tipe.toUpperCase(), Masuk: t.tipe === 'masuk' ? t.nominal : 0, Keluar: t.tipe === 'keluar' ? t.nominal : 0
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
      XLSX.writeFile(workbook, `Laporan_Keuangan_${new Date().toISOString().slice(0,10)}.xlsx`);
      setShowExportMenu(false);
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.text("LAPORAN KEUANGAN KAS RT. 02", 105, 15, { align: "center" });
      const tableRows = transaksi.map((t, i) => [i + 1, t.tanggal, t.keterangan, t.tipe.toUpperCase(), Number(t.nominal).toLocaleString('id-ID')]);
      doc.autoTable({ head: [["No", "Tanggal", "Keterangan", "Tipe", "Nominal"]], body: tableRows, startY: 25 });
      doc.save(`Laporan_Keuangan_${new Date().toISOString().slice(0,10)}.pdf`);
      setShowExportMenu(false);
  };

  return (
    <div className="grid-dashboard">
       {/* --- PERBAIKAN CSS DI SINI --- */}
       <style jsx>{`
         .grid-dashboard { 
            display: grid; 
            grid-template-columns: 1fr 2fr; /* Syntax CSS Benar */
            gap: 1.5rem; 
         }
         @media (max-width: 768px) { 
            .grid-dashboard { grid-template-columns: 1fr; } 
         }
         .input-glow:focus { outline: none; border-color: #00eaff !important; }
         .btn-hover:hover { filter: brightness(1.1); transform: translateY(-1px); }
         @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
       `}</style>

       {/* NOTIFIKASI */}
       {notification && (
        <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            background: 'rgba(10, 10, 10, 0.95)',
            borderLeft: `5px solid ${notification.type === 'success' ? '#00ff88' : '#ef4444'}`,
            padding: '1rem', borderRadius: '8px', color: '#fff', 
            display: 'flex', alignItems: 'center', gap: '1rem', animation: 'slideIn 0.3s'
        }}>
            {notification.type === 'success' ? <FaCheckCircle color="#00ff88"/> : <FaExclamationCircle color="#ef4444"/>}
            <div>{notification.message}</div>
        </div>
       )}

       {/* KIRI: TOMBOL / FORM INPUT */}
       <div>
          {!showForm ? (
              <button onClick={() => setShowForm(true)} className="btn-hover" style={{
                  width: '100%', padding: '1.5rem', background: 'rgba(15,15,15,0.6)',
                  border: '2px dashed rgba(0, 234, 255, 0.3)', borderRadius: '16px', color: '#00eaff',
                  fontWeight: '700', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
              }}>
                  <div style={{ background: 'rgba(0, 234, 255, 0.1)', padding:'10px', borderRadius:'50%' }}><FaPlus size={20} /></div>
                  Tambah Transaksi
              </button>
          ) : (
              <div style={{ background: "rgba(15,15,15,0.6)", border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#eee', fontSize: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      {editingId ? <><FaPen color='#f59e0b'/> Edit Transaksi</> : <><FaPlus color='#00eaff'/> Input Transaksi</>}
                  </h3>
                  <form onSubmit={handleSimpan} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', background:'rgba(0,0,0,0.3)', padding:'4px', borderRadius:'8px' }}>
                          <button type="button" onClick={() => setTipe('masuk')} style={{ background: tipe === 'masuk' ? '#00ff88' : 'transparent', color: tipe === 'masuk' ? '#000' : '#888', border:'none', padding:'8px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Pemasukan</button>
                          <button type="button" onClick={() => setTipe('keluar')} style={{ background: tipe === 'keluar' ? '#ff0055' : 'transparent', color: tipe === 'keluar' ? '#fff' : '#888', border:'none', padding:'8px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Pengeluaran</button>
                      </div>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px' }}/>
                      <input type="text" inputMode="numeric" placeholder="Nominal (Rp)" value={displayNominal} onChange={handleNominalChange} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px', fontWeight:'bold' }}/>
                      <textarea placeholder="Keterangan..." rows="3" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px' }}/>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                        <button type="submit" disabled={submitting} className="btn-hover" style={{ flex: 1, background: editingId ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px' }}>
                            {submitting ? <LuLoader className="animate-spin" /> : (editingId ? <FaSave /> : <FaPlus />)} {editingId ? "Update" : "Simpan"}
                        </button>
                        <button type="button" onClick={handleCancelEdit} className="btn-hover" style={{ background: '#333', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}><FaTimes /></button>
                      </div>
                  </form>
              </div>
          )}
       </div>

       {/* KANAN: LIST RIWAYAT */}
       <div style={{ background: "rgba(15,15,15,0.6)", border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', flex: 1, position: 'relative' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap: 'wrap', gap:'1rem'}}>
              <h3 style={{ margin: 0, color: '#eee', fontSize: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}><FaHistory color='#f59e0b'/> Riwayat Mutasi</h3>
              <div style={{position: 'relative'}} ref={exportMenuRef}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn-hover" style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <FaFileDownload /> Export <FaAngleDown />
                  </button>
                  {showExportMenu && (
                      <div style={{ position: 'absolute', right: 0, top: '110%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', width: '160px', zIndex: 10 }}>
                          <button onClick={handleExportPDF} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #333' }}><FaFilePdf color='#ef4444'/> PDF</button>
                          <button onClick={handleExportExcel} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><FaFileExcel color='#10b981'/> Excel</button>
                      </div>
                  )}
              </div>
          </div>
          
          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', minHeight:'300px' }}>
              {loading ? <div style={{textAlign:'center', padding:'2rem', color:'#666'}}>Memuat...</div> : 
              paginatedData.map((t) => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: editingId === t.id ? 'rgba(0, 234, 255, 0.1)' : 'rgba(255,255,255,0.02)', padding:'10px 15px', borderRadius:'10px', borderLeft: t.tipe === 'masuk' ? '4px solid #00ff88' : '4px solid #ff0055' }}>
                      <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontWeight: '600', fontSize:'0.9rem' }}>{t.keterangan}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666', marginTop:'2px' }}>{new Date(t.tanggal).toLocaleDateString('id-ID')}</div>
                      </div>
                      <div style={{ textAlign:'right', marginRight:'1rem', color: t.tipe === 'masuk' ? '#00ff88' : '#ff0055', fontWeight:'bold' }}>{t.tipe === 'masuk' ? '+' : '-'} {formatRp(t.nominal)}</div>
                      <div style={{display:'flex', gap:'5px'}}>
                          <button onClick={() => handleEdit(t)} style={{ background:'none', border:'none', color:'#444', cursor:'pointer' }} title="Edit"><FaPen size={14} /></button>
                          <button onClick={() => handleDelete(t.id)} style={{ background:'none', border:'none', color:'#444', cursor:'pointer' }} title="Hapus"><FaTrash size={14} /></button>
                      </div>
                  </div>
              ))}
          </div>

          {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:'1rem', marginTop:'1.5rem', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'1rem' }}>
                  <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} style={{ background: '#333', color: '#fff', border:'none', padding:'8px 12px', borderRadius:'6px', cursor: currentPage===1?'default':'pointer', opacity: currentPage===1?0.5:1 }}><FaChevronLeft /></button>
                  <span style={{color:'#888', display:'flex', alignItems:'center', fontSize:'0.9rem'}}>{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} style={{ background: '#333', color: '#fff', border:'none', padding:'8px 12px', borderRadius:'6px', cursor: currentPage===totalPages?'default':'pointer', opacity: currentPage===totalPages?0.5:1 }}><FaChevronRight /></button>
              </div>
          )}
       </div>
    </div>
  );
}