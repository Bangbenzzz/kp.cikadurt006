"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from '@/lib/firebase';

// IMPORT KOMPONEN YANG SUDAH DIPISAH
import { inputStyle, buttonStyle } from "./components/styles";
import PersonForm from "./components/PersonForm";
import FamilyForm from "./components/FamilyForm";

// KONFIGURASI SPREADSHEET
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytxfoLgfimf69ICLawjpJOr2cwKG1xhCDDOAW2AyQLneCvtMrml8KUcRx6LKS83LJh8w/exec"; 

// --- HELPER (Bisa dipindah ke utils.js kalau mau lebih rapi lagi) ---
const getAge = (dateString) => {
    if (!dateString) return null;
    let birthDate; try { const d = new Date(dateString); if (isNaN(d.getTime())) return null; birthDate = d; } catch (e) { return null; }
    const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};
const getAgeCategory = (age) => { 
    if (age === null || isNaN(age) || age < 0) return "Tidak Diketahui"; 
    if (age <= 5) return "Balita"; if (age <= 11) return "Anak"; if (age <= 25) return "Remaja"; if (age <= 45) return "Dewasa"; if (age <= 59) return "Pra-Lansia"; return "Lansia";                    
};
const formatTableDate = (dateString) => { if (!dateString) return '-'; const date = new Date(dateString); if (isNaN(date.getTime())) return dateString; const day = String(date.getDate()).padStart(2, '0'); const month = String(date.getMonth() + 1).padStart(2, '0'); const year = date.getFullYear(); return `${day}/${month}/${year}`; };
const getKategoriText = (w) => { if (w.is_dead) return "MENINGGAL"; const cats = []; if (w.is_yatim) cats.push("Yatim/Piatu"); if (w.is_duafa) cats.push("Duafa"); return cats.length > 0 ? cats.join(", ") : "Warga Biasa"; };

// --- MODAL & TOAST ---
const Modal = ({ isOpen, onClose, children, maxWidth = "600px" }) => { const [m,sM]=useState(false); useEffect(()=>sM(true),[]); if(!m||!isOpen)return null; return ReactDOM.createPortal( <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:'blur(5px)',padding:'1rem'}} onClick={e=>e.stopPropagation()}> <div style={{background:"#161616",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"1.5rem",width:"100%",maxWidth:maxWidth, maxHeight:'90vh', overflowY:'auto'}} onClick={e=>e.stopPropagation()}> {children} </div> </div>, document.body ); };
const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle }) => ( <div> <h3 style={{color:confirmStyle.color,textAlign:'center',marginTop:0}}>{title}</h3> <p style={{textAlign:'center',color:'#aaa',margin:'1.5rem 0'}}>{message}</p> <div style={{display:'flex',justifyContent:'center',gap:'1rem'}}> <button onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button> </div> </div> );
const ToastNotification = ({ message, type, isVisible, onClose }) => { const [m,sM]=useState(false); useEffect(()=>sM(true),[]); if(!m)return null; const col=type==='success'?'#00ff88':'#ff4d4f'; return ReactDOM.createPortal( <div style={{position:'fixed',top:'20px',left:'50%',transform:isVisible?'translate(-50%,0)':'translate(-50%,-200%)',background:`${col}1A`,border:`1px solid ${col}80`,color:'#fff',padding:'0.75rem 1.5rem',borderRadius:'50px',zIndex:9999,opacity:isVisible?1:0,transition:'all 0.5s',backdropFilter:'blur(12px)'}}> {message} </div>, document.body ); };

// --- HALAMAN UTAMA ---
export default function WargaPage() {
  const [warga, setWarga] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [ageFilter, setAgeFilter] = useState(null); 
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' }); 
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const showToast = useCallback((message, type = 'success') => { setToast({ isVisible: true, message, type }); }, []); 
  useEffect(() => { if (toast.isVisible) { const timer = setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000); return () => clearTimeout(timer); } }, [toast.isVisible]);

  const [currentPage, setCurrentPage] = useState(1);
  const dataPerPage = 10;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "warga"), (snap) => {
        const list = snap.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id,
                ...d, 
                nama: d.nama || "(Tanpa Nama)", nik: String(d.nik || "-"), no_kk: String(d.no_kk || "-"), alamat: d.alamat || "Kp. Cikadu", rt: String(d.rt || "06"), rw: String(d.rw || "19"), jenis_kelamin: d.jenis_kelamin || "L", gol_darah: d.gol_darah || "-", tgl_lahir: d.tgl_lahir || "", tempat_lahir: d.tempat_lahir || "", pekerjaan: d.pekerjaan || "-", status: d.status || "Warga", agama: d.agama || "Islam", pendidikan: d.pendidikan || "-"
            };
        });
        const rolePriority = { "Kepala Keluarga": 1, "Istri": 2, "Anak": 3 };
        list.sort((a, b) => { const kkA = String(a.no_kk || ''); const kkB = String(b.no_kk || ''); if (kkA < kkB) return -1; if (kkA > kkB) return 1; return (rolePriority[a.status] || 99) - (rolePriority[b.status] || 99); });
        setWarga(list); setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub(); 
  }, []); 

  // --- FUNGSI SYNC ---
  const syncToSheet = async (data) => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_URL")) return; 
      try {
          const spreadsheetData = { ...data, jenis_kelamin: data.jenis_kelamin === 'Laki- Laki' ? 'Laki-laki' : (data.jenis_kelamin === 'Perempuan' ? 'Perempuan' : data.jenis_kelamin), action: data.action || 'save' };
          await fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spreadsheetData) });
      } catch (e) { console.error("Gagal backup ke Sheet", e); }
  };

  const handleSave = async (data) => {
    // 1. Validasi Input Kosong
    if (!data.nik) return showToast("NIK Wajib diisi", "error");
    
    const cleanNIK = String(data.nik).trim(); // Bersihkan spasi

    // 2. CEK DUPLIKAT (Hanya jika mode 'add' / Tambah Baru)
    if (modalState.type === 'add') {
        try {
            // Cek ke database apakah NIK ini sudah ada dokumennya?
            const docRef = doc(db, "warga", cleanNIK);
            const docSnap = await getDoc(docRef); // Perlu import getDoc
            
            if (docSnap.exists()) {
                // JIKA KETEMU, STOP! JANGAN DISIMPAN.
                const existingName = docSnap.data().nama;
                showToast(`GAGAL: NIK ${cleanNIK} sudah dipakai oleh "${existingName}"`, "error");
                return; // Keluar dari fungsi, batalkan penyimpanan
            }
        } catch (e) {
            console.error("Error cek NIK:", e);
            showToast("Gagal memverifikasi NIK (Cek koneksi internet)", "error");
            return;
        }
    }

    // 3. Jika lolos pengecekan, baru simpan
    try {
        await setDoc(doc(db, "warga", cleanNIK), {
            ...data,
            nik: cleanNIK // Pastikan NIK yang disimpan versi bersih
        });
        syncToSheet(data); 
        showToast(modalState.type === 'edit' ? "Data berhasil diperbarui" : "Data berhasil disimpan", 'success');
        setModalState({ type: null, data: null });
    } catch(e) { 
        console.error(e);
        showToast("Terjadi kesalahan saat menyimpan data", 'error'); 
    }
};

// --- FUNGSI TAMBAH KELUARGA (PASTE DI BAWAH handleSave) ---
const handleAddFamily = async (dataFamily) => {
    // 1. LOADING CHECK: Cek semua NIK dalam daftar keluarga dulu sebelum disimpan
    try {
        // Kita pakai map dan Promise.all untuk ngecek NIK satu per satu secara paralel
        const checkPromises = dataFamily.map(async (person) => {
            const cleanNIK = String(person.nik).trim();
            
            // Validasi dasar
            if (!cleanNIK) throw new Error(`Ada anggota keluarga (${person.nama}) tanpa NIK!`);
            
            // Cek ke Database
            const docRef = doc(db, "warga", cleanNIK);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                // Jika NIK sudah ada, lempar Error biar proses batal
                throw new Error(`GAGAL: NIK ${cleanNIK} milik ${person.nama} sudah terdaftar di sistem!`);
            }
            return person; 
        });

        // Tunggu semua pengecekan selesai. Jika ada 1 saja error, dia lari ke catch.
        await Promise.all(checkPromises);

    } catch (validationError) {
        // Munculkan notifikasi error merah
        showToast(validationError.message, 'error');
        return; // STOP TOTAL, jangan lanjut simpan
    }

    // 2. Jika semua aman (tidak ada error), baru simpan ke database
    try {
        const batchPromises = dataFamily.map(person => { 
            const cleanNIK = String(person.nik).trim();
            const finalData = { ...person, nik: cleanNIK };
            
            // Simpan ke Google Sheet (Backup)
            syncToSheet(finalData); 
            
            // Simpan ke Firebase
            return setDoc(doc(db, "warga", cleanNIK), finalData); 
        });
        
        await Promise.all(batchPromises);
        showToast("Seluruh Keluarga berhasil ditambahkan", 'success');
        setModalState({ type: null, data: null });
    } catch(e) { 
        console.error(e);
        showToast("Gagal menyimpan data keluarga", 'error'); 
    }
};


  const handleDelete = async () => {
      if(modalState.data?.id) { try { const dataToDelete = { ...modalState.data, action: 'delete' }; syncToSheet(dataToDelete); await deleteDoc(doc(db, "warga", modalState.data.id)); showToast("Data berhasil dihapus", 'success'); } catch(e) { showToast("Gagal hapus", 'error'); } }
      setModalState({ type: null, data: null });
  };

  const statistics = useMemo(() => { 
      const hidupWarga = warga.filter(w => !w.is_dead); 
      const stats = { total: warga.length, hidup: hidupWarga.length, meninggal: warga.filter(w => w.is_dead).length, yatim: hidupWarga.filter(w => w.is_yatim).length, duafa: hidupWarga.filter(w => w.is_duafa).length, kepala_keluarga: hidupWarga.filter(w => w.status === "Kepala Keluarga").length, istri: hidupWarga.filter(w => w.status === "Istri").length, anak: hidupWarga.filter(w => w.status === "Anak").length, usia: { "Balita": 0, "Anak": 0, "Remaja": 0, "Dewasa": 0, "Pra-Lansia": 0, "Lansia": 0 } }; 
      hidupWarga.forEach(w => { const age = getAge(w.tgl_lahir); const category = getAgeCategory(age); if (stats.usia[category] !== undefined) { stats.usia[category]++; } }); 
      return stats; 
  }, [warga]);

  const filteredWarga = useMemo(() => {
    let res = warga;
    if (searchTerm) { const term = searchTerm.toLowerCase(); res = res.filter(w => (w.nama && w.nama.toLowerCase().includes(term)) || (w.nik && String(w.nik).includes(term)) || (w.no_kk && String(w.no_kk).includes(term))); }
    if (ageFilter) { if (ageFilter === 'Meninggal') res = res.filter(w => w.is_dead); else if (ageFilter === 'Yatim') res = res.filter(w => w.is_yatim); else if (ageFilter === 'Duafa') res = res.filter(w => w.is_duafa); else if (['Kepala Keluarga', 'Istri', 'Anak'].includes(ageFilter)) res = res.filter(w => w.status === ageFilter); else res = res.filter(w => getAgeCategory(getAge(w.tgl_lahir)) === ageFilter); }
    return res;
  }, [warga, searchTerm, ageFilter]);

  const startIndex = (currentPage - 1) * dataPerPage;
  const currentWarga = filteredWarga.slice(startIndex, startIndex + dataPerPage);
  const totalPages = Math.ceil(filteredWarga.length / dataPerPage);
  const emptyWarga = { id: null, nama: "", nik: "", no_kk: "", nama_kk: "", rt: "06", rw: "19", alamat: "Kp. Cikadu", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", gol_darah: "-", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", status: "Warga", is_yatim: false, is_duafa: false, is_dead: false };
  const renderFilterLabel = () => { if (!ageFilter) return `Semua Warga (${statistics.hidup})`; if (['Kepala Keluarga', 'Istri', 'Anak'].includes(ageFilter)) return `${ageFilter}`; if (['Balita', 'Anak', 'Remaja', 'Dewasa', 'Pra-Lansia', 'Lansia'].includes(ageFilter)) return `${ageFilter} (${statistics.usia[ageFilter]})`; if (ageFilter === 'Yatim') return `Yatim (${statistics.yatim})`; if (ageFilter === 'Duafa') return `Duafa (${statistics.duafa})`; if (ageFilter === 'Meninggal') return `Meninggal (${statistics.meninggal})`; return ageFilter; };


  // --- FUNGSI EXPORT PDF (DENGAN NOTIFIKASI BERTAHAP) ---
  const handleExportPDF = async () => {
    if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
    
    // 1. Notif Awal
    showToast("Menyiapkan PDF... Harap tunggu", "warning"); // Pakai warna kuning/warning biar beda
    
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const logo = new Image(); logo.src = '/logo-rt.png'; 
    logo.onload = () => {
        const doc = new jsPDF('l', 'mm', 'a3');
        const pageWidth = doc.internal.pageSize.width; const pageHeight = doc.internal.pageSize.height;
        
        const tableColumn = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Agama", "Gol", "Tempat Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan" ];
        const tableRows = filteredWarga.map((w, index) => [ index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.alamat, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.agama, w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan ]);
        
        const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
        const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
        
        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 50, theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, valign: 'middle', overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 9, lineColor: [68, 113, 196] },
            alternateRowStyles: { fillColor: [242, 242, 242] },
            
            // SETTINGAN LEBAR KOLOM YANG SUDAH PAS (A3 MENTOK KANAN)
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center' },       // No
                1: { cellWidth: 32, halign: 'center' },       // No KK
                2: { cellWidth: 32, halign: 'center' },       // NIK
                3: { cellWidth: 83 },                         // Nama Lengkap (LEBAR)
                4: { cellWidth: 22 },                         // Hub Keluarga
                5: { cellWidth: 15 },                         // Alamat (SEMPIT)
                6: { cellWidth: 8, halign: 'center' },        // RT
                7: { cellWidth: 12, halign: 'center' },       // RW
                8: { cellWidth: 18, halign: 'center' },       // Jenis Kelamin
                9: { cellWidth: 18, halign: 'center' },       // Agama
                10: { cellWidth: 12, halign: 'center' },      // Gol Darah
                11: { cellWidth: 22, halign: 'center' },      // Tempat Lahir
                12: { cellWidth: 20, halign: 'center' },      // Tgl Lahir
                13: { cellWidth: 12, halign: 'center' },      // Usia
                14: { cellWidth: 34 },                        // Pendidikan
                15: { cellWidth: 30 }                         // Pekerjaan
            },
            
            didParseCell: (data) => { if (data.section === 'body') { const row = filteredWarga[data.row.index]; if (row && row.is_dead) { data.cell.styles.textColor = [255, 77, 79]; data.cell.styles.fontStyle = 'bold'; } } },
            didDrawPage: (data) => {
                doc.addImage(logo, 'PNG', 20, 10, 25, 25);
                doc.setFont("times", "bold"); doc.setFontSize(20); doc.text("KETUA RT. 06 RW. 19", pageWidth / 2, 16, { align: 'center' });
                doc.setFontSize(20); doc.text("DESA DAYEUH", pageWidth / 2, 24, { align: 'center' });
                doc.setFontSize(20); doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 32, { align: 'center' });
                doc.setFont("times", "normal"); doc.setFontSize(11); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 39, { align: 'center' });
                doc.setLineWidth(1); doc.line(20, 44, pageWidth - 20, 44); 
                doc.setFontSize(10); doc.setTextColor(100); doc.text(`Waktu Export: ${exportTime}`, pageWidth - 20, 49, { align: 'right' }); doc.text(filterText, 20, 49, { align: 'left' });
                doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(data.settings.margin.left, pageHeight - 10, pageWidth - data.settings.margin.right, pageHeight - 10);
                doc.setFontSize(9); doc.setTextColor(100); doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - data.settings.margin.right, pageHeight - 5, { align: 'right' }); doc.text("Sistem Administrasi RT Kp. Cikadu", data.settings.margin.left, pageHeight - 5);
            },
            margin: { top: 55, bottom: 15, left: 20, right: 20 }
        });

        // 2. Notif Proses Download (Tepat sebelum save)
        showToast("Mengunduh PDF...", "success"); // Pakai warna hijau biar user tau ini tahap akhir
        
        doc.save(`Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.pdf`);
        
        // 3. Notif Selesai (Pakai timeout agar muncul setelah notif 'Mengunduh' terbaca)
        setTimeout(() => {
            showToast("PDF sudah terdownload", "success");
        }, 1500); // Muncul 1.5 detik setelah tombol ditekan
    };
    logo.onerror = () => { showToast("Gagal memuat file logo.", "error"); };
};

  // --- FUNGSI EXPORT EXCEL (DENGAN NOTIFIKASI BERTAHAP) ---
  const handleExportExcel = async () => {
    if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
    
    // 1. Notif Awal
    showToast("Menyiapkan Excel... Harap tunggu", "warning");

    const ExcelJS = (await import("exceljs")).default;
    const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Warga');
    const kopRows = [ ["KETUA RT. 06 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"] ];
    kopRows.forEach((row, index) => { const currentRow = worksheet.getRow(index + 1); currentRow.values = [row[0]]; worksheet.mergeCells(`A${index + 1}:R${index + 1}`); currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; if (index === 0) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 1) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 2) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else currentRow.getCell(1).font = { size: 10, name: 'Times New Roman' }; });
    worksheet.getRow(5).values = [""]; worksheet.mergeCells('A5:R5'); worksheet.getCell('A5').border = { bottom: { style: 'medium' } };
    worksheet.getRow(6).values = [filterText, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Export: ${exportTime}`]; worksheet.mergeCells('A6:E6'); worksheet.mergeCells('R6:R6'); worksheet.getCell('A6').font = { bold: true }; worksheet.getCell('R6').alignment = { horizontal: 'right' }; worksheet.getCell('R6').font = { bold: true };
    const headerRow = worksheet.getRow(8); 
    headerRow.values = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Agama", "Gol", "Tempat Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan", "Kategori" ];
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    filteredWarga.forEach((w, index) => { 
        const rowValues = [ index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.alamat, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.agama, w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan, getKategoriText(w) ]; 
        const row = worksheet.addRow(rowValues); 
        if (w.is_dead) { row.eachCell((cell) => { cell.font = { color: { argb: 'FFFF0000' } }; }); }
        row.eachCell((cell, colNumber) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; if ([1, 7, 8, 9, 11, 13, 14].includes(colNumber)) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; } else { cell.alignment = { vertical: 'middle', horizontal: 'left' }; } }); 
    });
    worksheet.columns = [ { width: 5 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 6 }, { width: 6 }, { width: 15 }, { width: 15 }, { width: 5 }, { width: 15 }, { width: 15 }, { width: 6 }, { width: 25 }, { width: 20 }, { width: 20 } ];
    
    // 2. Notif Proses Download
    showToast("Mengunduh Excel...", "success");

    const buffer = await workbook.xlsx.writeBuffer(); 
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
    const url = window.URL.createObjectURL(blob); 
    const a = document.createElement('a'); a.href = url; a.download = `Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); window.URL.revokeObjectURL(url);
    
    // 3. Notif Selesai (Pakai timeout)
    setTimeout(() => {
        showToast("Excel sudah terdownload", "success");
    }, 1500);
  };

  return (
    <div>
        <style>{`
            .custom-scroll::-webkit-scrollbar { width: 5px; } .custom-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); } .custom-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; } .custom-scroll::-webkit-scrollbar-thumb:hover { background: #00eaff; } .dropdown-item:hover { background: rgba(0, 234, 255, 0.15) !important; color: #fff !important; }
        `}</style>

        {/* --- HEADER & FILTER AREA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <input type="text" placeholder="Cari Nama / NIK / KK..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={{...inputStyle, width: '100%', maxWidth:'300px'}} />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                    <button onClick={() => setModalState({ type: 'addFamily', data: emptyWarga })} style={buttonStyle.addFamily}>+ Keluarga</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={buttonStyle.exportTrigger}>📤 Export ▼</button>
                        {showExportMenu && ( <div style={buttonStyle.dropdownMenu} onMouseLeave={() => setShowExportMenu(false)}> <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#ff4d4f'}}>📄 Export PDF</button> <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#00c853'}}>📊 Export Excel</button> </div> )}
                    </div>
                </div>
             </div>
             
             {/* DROPDOWN FILTER CUSTOM */}
             <div style={{ padding: '1rem', background: 'rgba(0, 170, 255, 0.03)', border: '1px solid rgba(0, 170, 255, 0.1)', borderRadius: '10px', position:'relative' }}>
               <label style={{ color: '#00eaff', marginBottom: '0.5rem', display: 'block', fontWeight: '600', fontSize: '0.85rem' }}>Filter Statistik (Pemerintah):</label>
               <div onClick={() => setIsFilterOpen(!isFilterOpen)} style={{ width: 'auto', minWidth: '220px', maxWidth: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'rgba(20, 20, 20, 0.8)', border: `1px solid ${isFilterOpen ? '#00eaff' : '#444'}`, color: ageFilter ? '#fff' : '#ccc', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: isFilterOpen ? '0 0 10px rgba(0, 234, 255, 0.2)' : 'none', transition: 'all 0.3s ease' }}>
                  <span style={{ fontWeight: '500' }}>{renderFilterLabel()}</span>
                  <span style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#00eaff' }}>▼</span>
               </div>
               {isFilterOpen && (
                   <>
                    <div style={{position:'fixed', inset:0, zIndex:90}} onClick={() => setIsFilterOpen(false)}/>
                    <div className="custom-scroll" style={{ position: 'absolute', top: 'calc(100% + 5px)', left: '1rem', right: 'auto', minWidth: '250px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 95, maxHeight: '300px', overflowY: 'auto', backdropFilter: 'blur(10px)', padding: '0.5rem 0' }}>
                        <div onClick={() => { setAgeFilter(null); setIsFilterOpen(false); }} className="dropdown-item" style={{ padding: '0.8rem 1rem', cursor: 'pointer', color: !ageFilter ? '#00eaff' : '#ccc', fontSize: '0.85rem', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}> <span>Semua Warga ({statistics.hidup})</span> {!ageFilter && <span style={{color:'#00eaff'}}>✓</span>} </div>
                        <div style={{ padding: '0.6rem 1rem 0.2rem', color: '#666', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing:'1px' }}>Status Keluarga</div>
                        {[{l: 'Kepala Keluarga', v: statistics.kepala_keluarga}, {l: 'Istri', v: statistics.istri}, {l: 'Anak', v: statistics.anak}].map((item) => ( <div key={item.l} onClick={() => { setAgeFilter(item.l); setIsFilterOpen(false); }} className="dropdown-item" style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: ageFilter===item.l?'#00eaff':'#ccc', fontSize: '0.85rem', display:'flex', justifyContent:'space-between' }}> {item.l} <span style={{opacity:0.5, fontSize:'0.75rem', background:'rgba(255,255,255,0.1)', padding:'0 6px', borderRadius:'4px'}}>{item.v}</span> </div> ))}
                        <div style={{ padding: '0.8rem 1rem 0.2rem', color: '#666', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing:'1px' }}>Berdasarkan Usia</div>
                        {[{l: 'Balita', d: '0-5 Thn', v: statistics.usia['Balita']}, {l: 'Anak', d: '6-11 Thn', v: statistics.usia['Anak']}, {l: 'Remaja', d: '12-25 Thn', v: statistics.usia['Remaja']}, {l: 'Dewasa', d: '26-45 Thn', v: statistics.usia['Dewasa']}, {l: 'Pra-Lansia', d: '46-59 Thn', v: statistics.usia['Pra-Lansia']}, {l: 'Lansia', d: '60+ Thn', v: statistics.usia['Lansia']}].map((item) => ( <div key={item.l} onClick={() => { setAgeFilter(item.l); setIsFilterOpen(false); }} className="dropdown-item" style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: ageFilter===item.l?'#00eaff':'#ccc', fontSize: '0.85rem', display:'flex', justifyContent:'space-between' }}> <span>{item.l} <span style={{fontSize:'0.7rem', color:'#666'}}>({item.d})</span></span> <span style={{opacity:0.5, fontSize:'0.75rem', background:'rgba(255,255,255,0.1)', padding:'0 6px', borderRadius:'4px'}}>{item.v}</span> </div> ))}
                        <div style={{ padding: '0.8rem 1rem 0.2rem', color: '#666', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing:'1px' }}>Sosial & Lainnya</div>
                        {[{l: 'Yatim', v: statistics.yatim, col: '#e0e0e0'}, {l: 'Duafa', v: statistics.duafa, col: '#e0e0e0'}, {l: 'Meninggal', v: statistics.meninggal, col: '#ff4d4f'}].map((item) => ( <div key={item.l} onClick={() => { setAgeFilter(item.l); setIsFilterOpen(false); }} className="dropdown-item" style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: ageFilter===item.l?'#00eaff':item.col, fontSize: '0.85rem', display:'flex', justifyContent:'space-between' }}> {item.l} <span style={{opacity:0.5, fontSize:'0.75rem', background:'rgba(255,255,255,0.1)', padding:'0 6px', borderRadius:'4px'}}>{item.v}</span> </div> ))}
                    </div>
                   </>
               )}
            </div>
        </div>

        {/* --- TABEL --- */}
        <div style={{ overflowX: 'auto', background: "rgba(10,10,10,0.4)", borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1800px', fontSize: '0.8rem' }}>
            <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>No</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>No KK</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>NIK</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Nama Lengkap</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Hub Keluarga</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Alamat</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap', textAlign: 'center'}}>RT</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap', textAlign: 'center'}}>RW</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Jenis Kelamin</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Agama</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Gol Darah</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Tempat Lahir</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Tgl Lahir</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Usia</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Pendidikan</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Pekerjaan</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Kategori</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? ( <tr><td colSpan="18" style={{textAlign: 'center', padding: '2rem', color: '#555'}}>Memuat data...</td></tr> ) : currentWarga.map((w, i) => {
                        let statusKategori = "Warga Biasa"; let colorKategori = "#888"; 
                        if (w.is_dead) { statusKategori = "MENINGGAL"; colorKategori = "#ff4d4f"; } else { const cats = []; if (w.is_yatim) cats.push("Yatim/Piatu"); if (w.is_duafa) cats.push("Duafa"); if (cats.length > 0) { statusKategori = cats.join(", "); colorKategori = "#ffaa00"; } }
                        return (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0, 170, 255, 0.05)' : 'transparent' }}>
                                <td style={{padding:'8px', textAlign:'center', color:'#666'}}>{startIndex + i + 1}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.no_kk}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.nik}</td>
                                <td style={{padding:'8px', color: w.is_dead ? '#ff4d4f' : '#fff', fontWeight:'500'}}>{w.nama}</td>
                                <td style={{padding:'8px', color:'#00ff88'}}>{w.status}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.alamat}</td>
                                <td style={{padding:'8px', color:'#bbb', textAlign:'center'}}>{w.rt}</td>
                                <td style={{padding:'8px', color:'#bbb', textAlign:'center'}}>{w.rw}</td>
                                <td style={{padding:'8px', color:'#00eaff'}}>{w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.agama}</td>
                                <td style={{padding:'8px', color:'#bbb', textAlign:'center'}}>{w.gol_darah}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.tempat_lahir}</td>
                                <td style={{padding:'8px', color:'#bbb', textAlign:'center'}}>{formatTableDate(w.tgl_lahir)}</td>
                                <td style={{padding:'8px', color:'#fff', textAlign:'center'}}>{getAge(w.tgl_lahir)}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.pendidikan}</td>
                                <td style={{padding:'8px', color:'#bbb'}}>{w.pekerjaan}</td>
                                <td style={{padding:'8px', color: colorKategori, fontWeight: w.is_dead || w.is_yatim || w.is_duafa ? 'bold' : 'normal'}}>{statusKategori}</td>
                                <td style={{padding:'8px', textAlign:'center', display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                                    <button onClick={() => setModalState({ type: 'edit', data: w })} style={{color:'#00aaff', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Edit</button>
                                    <button onClick={() => setModalState({ type: 'delete', data: w })} style={{color:'#ff4d4f', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Hapus</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* --- PAGINATION --- */}
        {totalPages > 1 && ( 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem', gap: '0.8rem', fontSize: '0.8rem' }}> 
                <span style={{ color: '#666' }}> {startIndex + 1}-{Math.min(startIndex + dataPerPage, filteredWarga.length)} dari {filteredWarga.length}</span> 
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}> 
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ ...buttonStyle.pagination, opacity: currentPage === 1 ? 0.4 : 1 }} > &lt; </button> 
                    {[...Array(totalPages)].map((_, i) => { const page = i + 1; if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) { return ( <button key={page} onClick={() => setCurrentPage(page)} style={page === currentPage ? buttonStyle.paginationActive : buttonStyle.pagination} disabled={page === currentPage} > {page} </button> ); } if (page === 2 && currentPage > 2) return <span key="d1" style={{color:'#555', padding:'0.3rem'}}>..</span>; if (page === totalPages - 1 && currentPage < totalPages - 1) return <span key="d2" style={{color:'#555', padding:'0.3rem'}}>..</span>; return null; })} 
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ ...buttonStyle.pagination, opacity: currentPage === totalPages ? 0.4 : 1 }} > &gt; </button> 
                </div> 
            </div> 
        )}

        {/* --- MODAL RENDERING --- */}
        <Modal isOpen={modalState.type === 'addFamily'} onClose={() => setModalState({ type: null })} maxWidth="95%"><FamilyForm onSave={handleAddFamily} onCancel={() => setModalState({ type: null })} /></Modal>
        <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={() => setModalState({ type: null })} maxWidth="800px"><PersonForm initialData={modalState.data || emptyWarga} onSave={handleSave} onCancel={() => setModalState({ type: null })} isEdit={modalState.type === 'edit'} /></Modal>
        <Modal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null })} maxWidth="400px"><ConfirmationModal onConfirm={handleDelete} onCancel={() => setModalState({ type: null })} title="Konfirmasi Hapus" message="Hapus data?" confirmText="Hapus" confirmStyle={buttonStyle.delete} /></Modal>
        <ToastNotification message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
}