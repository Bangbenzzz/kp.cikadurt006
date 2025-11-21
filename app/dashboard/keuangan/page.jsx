"use client";
import { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from 'exceljs';

// --- IMPORT FIREBASE ---
import { database, ref, push, remove, onValue, update } from '@/lib/firebase'; 
// -----------------------

// --- STYLE ---
const inputStyle = { width: '100%', padding: '0.65rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid #333', color: '#fff', borderRadius: '6px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' };

const buttonStyle = {
    masuk: { padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'linear-gradient(145deg, #00c853, #009624)', border: '1px solid #00c853', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    keluar: { padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'linear-gradient(145deg, #ff4d4f, #b71c1c)', border: '1px solid #ff4d4f', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    save: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    cancel: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    delete: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #ff4d4f, #b30021)', border: '1px solid #ff4d4f', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    exportTrigger: { flex: '1 1 auto', padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'linear-gradient(145deg, #8e2de2, #4a00e0)', border: '1px solid #8e2de2', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '120px' },
    pagination: { padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', },
    paginationActive: { padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'default', transition: 'all 0.2s', },
    dropdownMenu: { position: 'absolute', top: '110%', right: 0, background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.7)', zIndex: 100, overflow: 'hidden', minWidth: '150px', display: 'flex', flexDirection: 'column' },
    dropdownItem: { padding: '0.6rem 1rem', fontSize: '0.8rem', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#ccc', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }
};

// --- HELPER ---
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const formatDate = (dateString) => { if (!dateString) return '-'; const options = { day: '2-digit', month: 'long', year: 'numeric' }; return new Date(dateString).toLocaleDateString('id-ID', options); };

// --- MODAL & TOAST ---
const Modal = ({ isOpen, onClose, children, maxWidth = "450px" }) => { const [m, sM] = useState(false); useEffect(() => sM(true), []); if (!m || !isOpen) return null; return ReactDOM.createPortal(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:'blur(5px)',padding:'1rem'}}><div style={{background:"#161616",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"1.5rem",width:"100%",maxWidth:maxWidth,boxShadow:"0 0 40px rgba(0,0,0,0.5)"}} onClick={e=>e.stopPropagation()}>{children}</div></div>, document.body); };
const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle }) => ( <div> <h3 style={{color: confirmStyle.color, textAlign: 'center', marginTop: 0, fontSize: '1.2rem'}}>{title}</h3> <p style={{textAlign: 'center', color: '#aaa', margin: '1.5rem 0', fontSize: '0.9rem'}}>{message}</p> <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap-reverse' }}> <button onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button> </div> </div> );
const ToastNotification = ({ message, type, isVisible, onClose }) => { const [isBrowser, setIsBrowser] = useState(false); useEffect(() => setIsBrowser(true), []); if (!isBrowser) return null; const [color, icon] = type === 'success' ? ["#00ff88", "✅"] : ["#ff4d4f", "❌"]; return ReactDOM.createPortal( <div style={{ position: 'fixed', top: '20px', left: '50%', transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -200%)', background: `${color}1A`, border: `1px solid ${color}80`, color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '50px', zIndex: 9999, boxShadow: `0 10px 30px -5px ${color}4D`, opacity: isVisible ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', fontWeight: '500', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap', maxWidth: '90vw' }}> <span style={{ fontSize: '1.2rem' }}>{icon}</span> <span>{message}</span> <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>✕</button> </div>, document.body ); };

// --- FORM TRANSAKSI ---
const TransaksiForm = ({ initialData, onSave, onCancel, type }) => {
    const [form, setForm] = useState(initialData || { tgl: new Date().toISOString().split('T')[0], ket: '', jumlah: '' });
    const handleSubmit = (e) => { e.preventDefault(); if (!form.ket || !form.jumlah) return alert("Mohon lengkapi data!"); onSave({ ...form, type: form.type || type, jumlah: parseInt(form.jumlah) }); };
    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: (form.type || type) === 'masuk' ? '#00ff88' : '#ff4d4f', fontSize: '1.2rem' }}>{(form.type || type) === 'masuk' ? '💰 Input Pemasukan' : '💸 Input Pengeluaran'}</h2>
            <input type="date" value={form.tgl} onChange={e => setForm({ ...form, tgl: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} required />
            <input type="text" placeholder="Keterangan" value={form.ket} onChange={e => setForm({ ...form, ket: e.target.value })} style={inputStyle} required />
            <input type="number" placeholder="Jumlah (Rp)" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} style={inputStyle} required min="0" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button>
                <button type="submit" style={buttonStyle.save}>Simpan</button>
            </div>
        </form>
    );
};

export default function KeuanganPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState({ type: null, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const perPage = 10; 

    useEffect(() => {
        const unsub = onValue(ref(database, 'keuangan'), (snap) => {
            const raw = snap.val();
            const arr = raw ? Object.keys(raw).map(k => ({ id: k, ...raw[k] })) : [];
            arr.sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
            setData(arr);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const showToast = (message, type = 'success') => { setToast({ isVisible: true, message, type }); setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000); };

    const handleSave = async (formData) => {
        try { if (formData.id) { await update(ref(database, `keuangan/${formData.id}`), formData); showToast('Diperbarui!', 'success'); } else { await push(ref(database, 'keuangan'), formData); showToast('Disimpan!', 'success'); } setModalState({ type: null, data: null }); } catch (e) { showToast('Gagal.', 'error'); }
    };

    const handleDelete = async () => {
        if(modalState.data?.id) { try { await remove(ref(database, `keuangan/${modalState.data.id}`)); showToast('Dihapus.', 'success'); } catch(e) { showToast('Gagal.', 'error'); } } setModalState({ type: null, data: null });
    };

    const stats = useMemo(() => { let masuk = 0, keluar = 0; data.forEach(d => { if (d.type === 'masuk') masuk += d.jumlah; else keluar += d.jumlah; }); return { masuk, keluar, saldo: masuk - keluar }; }, [data]);
    const filteredData = useMemo(() => data.filter(d => d.ket.toLowerCase().includes(search.toLowerCase()) || d.tgl.includes(search)), [data, search]);
    const totalPages = Math.ceil(filteredData.length / perPage);
    const currentData = filteredData.slice((page - 1) * perPage, page * perPage);

    // --- EXPORT PDF ---
    const handleExportPDF = () => {
        if (!filteredData.length) { showToast("Data kosong.", "error"); return; }
        const logo = new Image(); logo.src = '/logo-rt.png';
        logo.onload = () => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const tableColumn = ["No", "Tanggal", "Keterangan", "Tipe", "Nominal"];
            const tableRows = filteredData.map((d, i) => [ i + 1, formatDate(d.tgl), d.ket, d.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran', formatRupiah(d.jumlah) ]);
            const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';

            autoTable(doc, {
                head: [tableColumn], body: tableRows, startY: 55, theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
                headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: {halign:'center', cellWidth: 10}, 3: {halign:'center'}, 4: {halign:'right'} },
                didDrawPage: (data) => {
                    doc.addImage(logo, 'PNG', 15, 10, 20, 20);
                    doc.setFont("times", "bold"); 
                    doc.setFontSize(14); doc.text("KETUA RT. 006 RW. 019", pageWidth / 2, 16, { align: 'center' });
                    doc.setFontSize(16); doc.text("DESA DAYEUH", pageWidth / 2, 24, { align: 'center' });
                    doc.setFontSize(14); doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 32, { align: 'center' });
                    doc.setFont("times", "normal"); doc.setFontSize(8); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 38, { align: 'center' });
                    doc.setFont("times", "bold"); doc.setFontSize(11); doc.text("Transaksi Keuangan Kas Saldo Kp. Cikadu", pageWidth / 2, 44, { align: 'center' });
                    doc.setLineWidth(1); doc.line(10, 47, pageWidth - 10, 47);
                    doc.setFont("times", "normal"); doc.setFontSize(8); doc.setTextColor(100); 
                    doc.text(`Export: ${exportTime}`, pageWidth - 10, 53, { align: 'right' });
                    doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(data.settings.margin.left, pageHeight - 10, pageWidth - data.settings.margin.right, pageHeight - 10);
                    doc.setFontSize(8); doc.setTextColor(100); 
                    doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - data.settings.margin.right, pageHeight - 5, { align: 'right' });
                    doc.text("Sistem Administrasi RT Kp. Cikadu - Laporan Keuangan", data.settings.margin.left, pageHeight - 5);
                },
                margin: { top: 55, bottom: 15, left: 10, right: 10 }
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(0);
            doc.setFillColor(240, 240, 240); doc.rect(10, finalY - 6, pageWidth - 20, 10, 'F'); 
            doc.text("TOTAL SALDO SAAT INI:", 14, finalY);
            doc.text(formatRupiah(stats.saldo), pageWidth - 14, finalY, { align: 'right' });

            doc.save(`Laporan_Keuangan_RT06_${new Date().toISOString().slice(0,10)}.pdf`);
        };
        logo.onerror = () => showToast("Gagal memuat logo.", "error");
    };

    // --- EXPORT EXCEL ---
    const handleExportExcel = async () => {
        if (!filteredData.length) return showToast("Data kosong!", "error");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Keuangan');
        const kop = [ ["KETUA RT. 006 RW. 019"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"], ["Transaksi Keuangan Kas Saldo Kp. Cikadu"] ];
        kop.forEach((r, i) => {
            const row = worksheet.getRow(i + 1); row.values = [r[0]]; worksheet.mergeCells(`A${i+1}:E${i+1}`);
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; 
            if (i===0) row.getCell(1).font = {bold:true, size:14, name:'Times New Roman'};
            else if (i===1) row.getCell(1).font = {bold:true, size:16, name:'Times New Roman'};
            else if (i===2) row.getCell(1).font = {bold:true, size:14, name:'Times New Roman'}; 
            else if (i===4) row.getCell(1).font = {bold:true, size:11, name:'Times New Roman'}; 
            else row.getCell(1).font = {size:10, name:'Times New Roman'};
        });
        worksheet.getRow(6).values = [""]; worksheet.mergeCells('A6:E6'); worksheet.getCell('A6').border = { bottom: { style: 'medium' } };
        
        const headerRow = worksheet.getRow(8);
        headerRow.values = ["No", "Tanggal", "Keterangan", "Tipe", "Nominal (Rp)"];
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });
        let currentRowIdx = 9;
        filteredData.forEach((d, i) => {
            const row = worksheet.addRow([ i + 1, d.tgl, d.ket, d.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran', d.jumlah ]);
            const color = d.type === 'masuk' ? 'FF008800' : 'FFFF0000';
            row.getCell(4).font = { color: { argb: color }, bold: true }; row.getCell(5).alignment = { horizontal: 'right' };
            row.eachCell(cell => cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} });
            currentRowIdx++;
        });

        // SALDO DI BAWAH TABEL (EXCEL)
        const saldoRowIdx = currentRowIdx + 2;
        const saldoRow = worksheet.getRow(saldoRowIdx);
        saldoRow.values = ["TOTAL SALDO SAAT INI:", "", "", "", formatRupiah(stats.saldo)];
        worksheet.mergeCells(`A${saldoRowIdx}:D${saldoRowIdx}`); 
        saldoRow.getCell(1).font = { bold: true, size: 12 }; saldoRow.getCell(1).alignment = { horizontal: 'right' };
        saldoRow.getCell(5).font = { bold: true, size: 12, color: { argb: 'FF0000FF' } }; saldoRow.getCell(5).alignment = { horizontal: 'right' };
        saldoRow.getCell(5).border = { top: { style: 'double' }, bottom: { style: 'double' } };

        worksheet.columns = [{width:5}, {width:15}, {width:40}, {width:15}, {width:20}];
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Laporan_Keuangan_RT06_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); window.URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* 1. KARTU RINGKASAN (DIPERKECIL & ANTI LUBER) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                
                {/* TOTAL SALDO (DI ATAS, SEJAJAR) */}
                <div style={{ background: '#111', border: '1px solid #00eaff', borderRadius: '8px', padding: '0.8rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: '#00eaff', fontSize: '0.65rem', letterSpacing: '1px', fontWeight:'bold', textTransform:'uppercase' }}>Total Saldo</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                        {formatRupiah(stats.saldo)}
                    </div>
                </div>

                <div style={{ background: '#111', border: '1px solid #00ff88', borderRadius: '8px', padding: '0.8rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: '#00ff88', fontSize: '0.65rem', letterSpacing: '1px', fontWeight:'bold', textTransform:'uppercase' }}>Pemasukan</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                        {formatRupiah(stats.masuk)}
                    </div>
                </div>

                <div style={{ background: '#111', border: '1px solid #ff4d4f', borderRadius: '8px', padding: '0.8rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: '#ff4d4f', fontSize: '0.65rem', letterSpacing: '1px', fontWeight:'bold', textTransform:'uppercase' }}>Pengeluaran</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                        {formatRupiah(stats.keluar)}
                    </div>
                </div>
            </div>

            {/* 2. CONTROLS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center' }}>
                <input type="text" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: '180px', padding:'0.5rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setModalState({ type: 'masuk' })} style={buttonStyle.masuk}>+ Masuk</button>
                    <button onClick={() => setModalState({ type: 'keluar' })} style={buttonStyle.keluar}>- Keluar</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={buttonStyle.exportTrigger}>📤 Export ▼</button>
                        {showExportMenu && (
                            <div style={buttonStyle.dropdownMenu} onMouseLeave={() => setShowExportMenu(false)}>
                                <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#ff4d4f'}}>📄 PDF</button>
                                <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#00c853'}}>📊 Excel</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. TABEL TRANSAKSI */}
            <div style={{ overflowX: 'auto', background: "rgba(10,10,10,0.4)", borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '600px', fontSize: '0.75rem' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{padding:'8px', color:'#00aaff', textAlign:'left'}}>Tanggal</th>
                            <th style={{padding:'8px', color:'#00aaff', textAlign:'left'}}>Keterangan</th>
                            <th style={{padding:'8px', color:'#00aaff', textAlign:'left'}}>Tipe</th>
                            <th style={{padding:'8px', color:'#00aaff', textAlign:'right'}}>Jumlah</th>
                            <th style={{padding:'8px', color:'#00aaff', textAlign:'center'}}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem', color:'#666'}}>Memuat...</td></tr> ) : currentData.length > 0 ? (
                            currentData.map((d) => (
                                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{padding:'8px', color:'#bbb'}}>{formatDate(d.tgl)}</td>
                                    <td style={{padding:'8px', color:'#fff', fontWeight:'500'}}>{d.ket}</td>
                                    <td style={{padding:'8px'}}>
                                        <span style={{ background: d.type === 'masuk' ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,79,0.1)', color: d.type === 'masuk' ? '#00ff88' : '#ff4d4f', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                            {d.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                                        </span>
                                    </td>
                                    <td style={{padding:'8px', textAlign:'right', color: d.type === 'masuk' ? '#00ff88' : '#ff4d4f', fontFamily:'monospace', fontSize:'0.8rem', whiteSpace: 'nowrap'}}>
                                        {d.type === 'masuk' ? '+' : '-'}{formatRupiah(d.jumlah)}
                                    </td>
                                    <td style={{padding:'8px', textAlign:'center', display:'flex', gap:'0.5rem', justifyContent:'center'}}>
                                        <button onClick={() => setModalState({ type: 'edit', data: d })} style={{color:'#00aaff', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Edit</button>
                                        <button onClick={() => setModalState({ type: 'delete', data: d })} style={{color:'#ff4d4f', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Hapus</button>
                                    </td>
                                </tr>
                            ))
                        ) : ( <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem', color:'#444'}}>Belum ada transaksi.</td></tr> )}
                    </tbody>
                </table>
            </div>

            {/* PAGINASI */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.7rem', color:'#666' }}>
                    <span>{(page-1)*perPage + 1}-{Math.min(page*perPage, filteredData.length)} dari {filteredData.length}</span>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={buttonStyle.pagination}>&lt;</button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)} style={page === i + 1 ? buttonStyle.paginationActive : buttonStyle.pagination}>{i + 1}</button>
                        ))}
                        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={buttonStyle.pagination}>&gt;</button>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <Modal isOpen={modalState.type === 'masuk' || modalState.type === 'keluar' || modalState.type === 'edit'} onClose={() => setModalState({ type: null, data: null })}>
                <TransaksiForm initialData={modalState.type === 'edit' ? modalState.data : null} type={modalState.type} onSave={handleSave} onCancel={() => setModalState({ type: null, data: null })} />
            </Modal>
            <Modal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null, data: null })} maxWidth="400px">
                <ConfirmationModal onConfirm={handleDelete} onCancel={() => setModalState({ type: null, data: null })} title="Hapus Data" message="Yakin hapus transaksi ini?" confirmText="Hapus" confirmStyle={buttonStyle.delete} />
            </Modal>
            <ToastNotification message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
        </div>
    );
}