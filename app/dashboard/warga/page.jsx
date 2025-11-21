"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 

// --- IMPORT FIREBASE ---
import { database, ref, update, remove, onValue, set } from '@/lib/firebase'; 
// -----------------------

// --- STYLE: DARK & NEON (VERSI ASLI) ---
const inputStyle = { width: '100%', padding: '0.65rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.6)', border: '1px solid #333', color: '#fff', borderRadius: '6px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' };
const selectCompactStyle = { ...inputStyle, width: 'auto', minWidth: '180px', maxWidth: '100%', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' };

const buttonStyle = {
    save: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    cancel: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    delete: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #ff4d4f, #b30021)', border: '1px solid #ff4d4f', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    pagination: { padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', },
    paginationActive: { padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'default', transition: 'all 0.2s', },
    addFamily: { flex: '1 1 auto', padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', justifyContent: 'center', minWidth: '140px' },
    exportTrigger: { flex: '1 1 auto', padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #8e2de2, #4a00e0)', border: '1px solid #8e2de2', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '140px' },
    dropdownMenu: { position: 'absolute', top: '110%', right: 0, background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.7)', zIndex: 100, overflow: 'hidden', minWidth: '180px', display: 'flex', flexDirection: 'column' },
    dropdownItem: { padding: '0.8rem 1rem', fontSize: '0.85rem', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#ccc', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }
};

const pendidikanOptions = ["Tidak/Belum Sekolah", "Belum Tamat SD/Sederajat", "Tamat SD/Sederajat", "SLTP/SEDERAJAT", "SLTA/SEDERAJAT", "Diploma I/II", "Akademi/Diploma III/S. Muda", "Diploma IV/Strata I", "Strata II", "Strata III"];
const golDarahOptions = ["-", "A", "B", "AB", "O"]; 

// --- HELPER FUNCTIONS ---
const getAge = (dateString) => {
    if (!dateString) return null;
    let birthDate;
    const parts = String(dateString).split('/');
    if (parts.length === 3) {
        let day = parseInt(parts[1], 10);
        let month = parseInt(parts[0], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) { year += (year > new Date().getFullYear() % 100) ? 1900 : 2000; }
        birthDate = new Date(year, month, day);
    } else {
        birthDate = new Date(dateString);
    }
    if (isNaN(birthDate)) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};

const getAgeCategory = (age) => { 
    if (age === null || isNaN(age) || age < 0) return "Tidak Diketahui"; 
    if (age <= 5) return "Balita";      
    if (age <= 11) return "Anak-anak";  
    if (age <= 25) return "Remaja";     
    if (age <= 59) return "Dewasa";     
    return "Lansia";                    
};

const formatTableDate = (dateString) => {
    if (!dateString) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateString;
};
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) { return dateString; }
    const parts = dateString.split('/');
    if (parts.length === 3) {
        let day = parts[1].padStart(2, '0');
        let month = parts[0].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) { year = (parseInt(year) > new Date().getFullYear() % 100) ? `19${year}` : `20${year}`; }
        return `${year}-${month}-${day}`;
    }
    try { return new Date(dateString).toISOString().split('T')[0]; } catch (e) { return ''; }
};

// --- MODAL & TOAST ---
const Modal = ({ isOpen, onClose, children, maxWidth = "600px" }) => { const [isBrowser, setIsBrowser] = useState(false); useEffect(() => setIsBrowser(true), []); if (!isBrowser || !isOpen) return null; return ReactDOM.createPortal( <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: 'blur(5px)', padding: '1rem', overflow: 'hidden' }}> <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: maxWidth, maxHeight: "calc(100vh - 2rem)", overflowY: 'auto', overflowX: 'hidden', boxShadow: "0 0 40px rgba(0,0,0,0.5)", boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}> {children} </div> </div>, document.body ); };
const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle }) => ( <div> <h3 style={{color: confirmStyle.color, textAlign: 'center', marginTop: 0, fontSize: '1.2rem'}}>{title}</h3> <p style={{textAlign: 'center', color: '#aaa', margin: '1.5rem 0', fontSize: '0.9rem'}}>{message}</p> <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap-reverse' }}> <button onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button> </div> </div> );
const ToastNotification = ({ message, type, isVisible, onClose }) => { const [isBrowser, setIsBrowser] = useState(false); useEffect(() => setIsBrowser(true), []); if (!isBrowser) return null; const [color, icon] = type === 'success' ? ["#00ff88", "✅"] : ["#ff4d4f", "❌"]; return ReactDOM.createPortal( <div style={{ position: 'fixed', top: '20px', left: '50%', transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -200%)', background: `${color}1A`, border: `1px solid ${color}80`, color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '50px', zIndex: 9999, boxShadow: `0 10px 30px -5px ${color}4D`, opacity: isVisible ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', fontWeight: '500', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap', maxWidth: '90vw' }}> <span style={{ fontSize: '1.2rem' }}>{icon}</span> <span>{message}</span> <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>✕</button> </div>, document.body ); };

// --- PERSON FORM ---
const PersonForm = ({ initialData, onSave, onCancel, isEdit = false, existingWarga = [] }) => { 
    const [formData, setFormData] = useState(initialData); 
    useEffect(() => { setFormData(initialData); }, [initialData]); 
    const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }; 
    const handleSubmit = (e) => { e.preventDefault(); if (!formData.nama || !formData.nik) { alert('Nama dan NIK wajib diisi!'); return; } const isDuplicateNIK = existingWarga.some(w => w.nik === formData.nik && w.id !== formData.id); if (isDuplicateNIK) { alert(`GAGAL SIMPAN: NIK ${formData.nik} sudah terdaftar!`); return; } onSave(formData); }; 
    return ( 
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}> 
            <h2 style={{ color: '#00eaff', margin: 0, marginBottom: '1rem', fontSize: '1.2rem' }}>{isEdit ? 'Edit Data Warga' : 'Tambah Data Warga'}</h2> 
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}> 
                <input name="nama" value={formData.nama} onChange={handleChange} placeholder="Nama Lengkap*" required style={inputStyle} /> 
                <input name="nik" value={formData.nik} onChange={handleChange} placeholder="NIK*" required style={inputStyle} /> 
                <input name="no_kk" value={formData.no_kk} onChange={handleChange} placeholder="No. KK*" required style={inputStyle} />
                <input name="nama_kk" value={formData.nama_kk} onChange={handleChange} placeholder="Nama Kepala Keluarga" style={inputStyle} />
                <div style={{ display: 'flex', gap: '0.5rem' }}> <input name="rt" value={formData.rt} onChange={handleChange} placeholder="RT" style={inputStyle} /> <input name="rw" value={formData.rw} onChange={handleChange} placeholder="RW" style={inputStyle} /> </div>
                <input name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Alamat" style={inputStyle} />
                <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> 
                <input name="tempat_lahir" value={formData.tempat_lahir} onChange={handleChange} placeholder="Tempat Lahir" style={inputStyle} /> 
                <input name="tgl_lahir" type="date" value={formData.tgl_lahir} onChange={handleChange} style={{...inputStyle, colorScheme: 'dark'}} /> 
                <input name="agama" value={formData.agama} onChange={handleChange} placeholder="Agama" style={inputStyle} /> 
                <select name="gol_darah" value={formData.gol_darah} onChange={handleChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
                <select name="pendidikan" value={formData.pendidikan} onChange={handleChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> 
                <input name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} placeholder="Pekerjaan" style={inputStyle} /> 
                <select name="status_kawin" value={formData.status_kawin} onChange={handleChange} style={inputStyle}><option value="Belum Kawin">Belum Kawin</option><option value="Kawin">Kawin</option><option value="Cerai Hidup">Cerai Hidup</option><option value="Cerai Mati">Cerai Mati</option></select>
                <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}> <option value="Kepala Keluarga">Kepala Keluarga</option> <option value="Istri">Istri</option> <option value="Anak">Anak</option> <option value="Warga">Warga</option> </select> 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid #333', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', fontSize: '0.85rem' }}> 
                    <label style={{ margin: 0, color: '#ccc', display:'flex', alignItems:'center', gap:'0.5rem' }}> <input name="is_yatim" type="checkbox" checked={formData.is_yatim || false} onChange={handleChange} /> Yatim/Piatu </label> 
                    <label style={{ margin: 0, color: '#ccc', display:'flex', alignItems:'center', gap:'0.5rem' }}> <input name="is_duafa" type="checkbox" checked={formData.is_duafa || false} onChange={handleChange} /> Duafa </label> 
                    <label style={{ margin: 0, color: formData.is_dead ? '#ff4d4f' : '#ccc', display:'flex', alignItems:'center', gap:'0.5rem' }}> <input name="is_dead" type="checkbox" checked={formData.is_dead || false} onChange={handleChange} /> Meninggal Dunia </label> 
                </div> 
            </div> 
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap-reverse' }}> 
                <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button> 
                <button type="submit" style={buttonStyle.save}>Simpan</button> 
            </div> 
        </form> 
    ); 
};

// --- FAMILY FORM ---
const FamilyForm = ({ onSave, onCancel, existingWarga = [] }) => { 
    const [no_kk, setNoKk] = useState(""); const [nama_kk, setNamaKk] = useState(""); const [alamat, setAlamat] = useState("Kp. Cikadu"); const [rt, setRt] = useState("06"); const [rw, setRw] = useState("19");
    const defaultPerson = { nama: "", nik: "", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", gol_darah: "-", is_dead: false, is_yatim: false, is_duafa: false }; 
    const [kepalakeluarga, setKepalakeluarga] = useState({ ...defaultPerson, jenis_kelamin: "L", status: "Kepala Keluarga", status_kawin: "Kawin" }); 
    const [istri, setIstri] = useState({ ...defaultPerson, jenis_kelamin: "P", status: "Istri", status_kawin: "Kawin" }); 
    const [anak, setAnak] = useState([ { ...defaultPerson, jenis_kelamin: "L", status: "Anak" } ]); 
    const handleKepalakeluargaChange = (e) => { const { name, value, type, checked } = e.target; setKepalakeluarga(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); if(name === 'nama') setNamaKk(value); }; 
    const handleIstriChange = (e) => { const { name, value, type, checked } = e.target; setIstri(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }; 
    const handleAnakChange = (index, e) => { const { name, value, type, checked } = e.target; const newAnak = [...anak]; newAnak[index] = { ...newAnak[index], [name]: type === 'checkbox' ? checked : value }; setAnak(newAnak); }; 
    const handleAddAnak = () => { setAnak(prev => [...prev, { ...defaultPerson, jenis_kelamin: "L", status: "Anak" }]); }; 
    const handleRemoveAnak = (index) => { setAnak(prev => prev.filter((_, i) => i !== index)); }; 
    const handleSubmit = (e) => { e.preventDefault(); if (!no_kk || !kepalakeluarga.nama || !kepalakeluarga.nik) { alert('Data Kepala Keluarga & No KK wajib diisi!'); return; } const nicksToCheck = []; if (kepalakeluarga.nik) nicksToCheck.push({ nik: kepalakeluarga.nik, role: 'Kepala Keluarga' }); if (istri.nik) nicksToCheck.push({ nik: istri.nik, role: 'Istri' }); anak.forEach((a, i) => { if(a.nik) nicksToCheck.push({ nik: a.nik, role: `Anak ke-${i+1}` }); }); for (const item of nicksToCheck) { const isTaken = existingWarga.some(w => w.nik === item.nik); if (isTaken) { alert(`GAGAL SIMPAN: NIK ${item.role} (${item.nik}) sudah terdaftar!`); return; } } const commonData = { no_kk, nama_kk, alamat, rt, rw }; const familyData = []; familyData.push({ ...kepalakeluarga, ...commonData }); if (istri.nama && istri.nik) { familyData.push({ ...istri, ...commonData }); } anak.forEach(a => { if (a.nama && a.nik) { familyData.push({ ...a, ...commonData }); } }); onSave(familyData); }; 
    return ( <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', maxHeight: '80vh'}}> <h2 style={{ color: '#00eaff', margin: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>Input Data Keluarga</h2> <div style={{ paddingBottom: '1rem', borderBottom: '2px solid rgba(0, 255, 136, 0.3)' }}> <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem'}}> <input name="no_kk" value={no_kk} onChange={(e) => setNoKk(e.target.value)} placeholder="Nomor KK*" required style={inputStyle} /> <input name="nama_kk" value={nama_kk} onChange={(e) => setNamaKk(e.target.value)} placeholder="Nama Kepala Keluarga" style={inputStyle} /> </div> <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem'}}> <input name="rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="RT" style={inputStyle} /> <input name="rw" value={rw} onChange={(e) => setRw(e.target.value)} placeholder="RW" style={inputStyle} /> <input name="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" style={inputStyle} /> </div> </div> <div style={{ borderLeft: '3px solid #00ff88', paddingLeft: '1rem' }}> <h3 style={{ color: '#00ff88', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Kepala Keluarga *</h3> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={kepalakeluarga.nama} onChange={handleKepalakeluargaChange} placeholder="Nama Lengkap*" required style={inputStyle} /> <input name="nik" value={kepalakeluarga.nik} onChange={handleKepalakeluargaChange} placeholder="NIK*" required style={inputStyle} /> <select name="jenis_kelamin" value={kepalakeluarga.jenis_kelamin} onChange={handleKepalakeluargaChange} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> <input name="tempat_lahir" value={kepalakeluarga.tempat_lahir} onChange={handleKepalakeluargaChange} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={kepalakeluarga.tgl_lahir} onChange={handleKepalakeluargaChange} style={{...inputStyle, colorScheme: 'dark'}} /> <input name="agama" value={kepalakeluarga.agama} onChange={handleKepalakeluargaChange} placeholder="Agama" style={inputStyle} /> <select name="gol_darah" value={kepalakeluarga.gol_darah} onChange={handleKepalakeluargaChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={kepalakeluarga.pendidikan} onChange={handleKepalakeluargaChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> <input name="pekerjaan" value={kepalakeluarga.pekerjaan} onChange={handleKepalakeluargaChange} placeholder="Pekerjaan" style={inputStyle} /> </div> </div> <div style={{ borderLeft: '3px solid #ff80ed', paddingLeft: '1rem' }}> <h3 style={{ color: '#ff80ed', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Istri (Opsional)</h3> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={istri.nama} onChange={handleIstriChange} placeholder="Nama Lengkap" style={inputStyle} /> <input name="nik" value={istri.nik} onChange={handleIstriChange} placeholder="NIK" style={inputStyle} /> <input name="tempat_lahir" value={istri.tempat_lahir} onChange={handleIstriChange} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={istri.tgl_lahir} onChange={handleIstriChange} style={{...inputStyle, colorScheme: 'dark'}} /> <input name="agama" value={istri.agama} onChange={handleIstriChange} placeholder="Agama" style={inputStyle} /> <select name="gol_darah" value={istri.gol_darah} onChange={handleIstriChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={istri.pendidikan} onChange={handleIstriChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> </div> </div> <div style={{ borderLeft: '3px solid #ffaa00', paddingLeft: '1rem' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '1rem', flexWrap: 'wrap' }}> <h3 style={{ color: '#ffaa00', margin: 0, fontSize: '0.95rem' }}>Anak (Opsional)</h3> <button type="button" onClick={handleAddAnak} style={{ ...buttonStyle.save, padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}> + Tambah Anak </button> </div> {anak.map((anakItem, index) => ( <div key={index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 170, 0, 0.2)' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}> <span style={{ color: '#ffaa00', fontWeight: '500', fontSize: '0.8rem' }}>Anak {index + 1}</span> <button type="button" onClick={() => handleRemoveAnak(index)} style={{ ...buttonStyle.delete, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}> Hapus </button> </div> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={anakItem.nama} onChange={(e) => handleAnakChange(index, e)} placeholder="Nama" style={inputStyle} /> <input name="nik" value={anakItem.nik} onChange={(e) => handleAnakChange(index, e)} placeholder="NIK" style={inputStyle} /> <select name="jenis_kelamin" value={anakItem.jenis_kelamin} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> <input name="tempat_lahir" value={anakItem.tempat_lahir} onChange={(e) => handleAnakChange(index, e)} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={anakItem.tgl_lahir} onChange={(e) => handleAnakChange(index, e)} style={{...inputStyle, colorScheme: 'dark'}} /> <select name="gol_darah" value={anakItem.gol_darah} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={anakItem.pendidikan} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> </div> </div> ))} </div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap-reverse' }}> <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button type="submit" style={buttonStyle.save}>Simpan Keluarga</button> </div> </form> ); };

// --- HALAMAN UTAMA ---
export default function WargaPage() {
  const [warga, setWarga] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [ageFilter, setAgeFilter] = useState(null); 
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' }); 
  const [showExportMenu, setShowExportMenu] = useState(false);

  const showToast = useCallback((message, type = 'success') => { setToast({ isVisible: true, message, type }); }, []); 
  useEffect(() => { if (toast.isVisible) { const timer = setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000); return () => clearTimeout(timer); } }, [toast.isVisible]);

  const [currentPage, setCurrentPage] = useState(1);
  const dataPerPage = 10;

  useEffect(() => {
    const wargaRef = ref(database, 'warga');
    const unsubscribe = onValue(wargaRef, (snapshot) => {
        const data = snapshot.val();
        let loadedWarga = [];
        const kkLookup = {}; // Untuk menyimpan data Kepala Keluarga berdasarkan No KK

        if (data) {
            const rawArray = Array.isArray(data) ? data.filter(Boolean) : Object.keys(data).map(key => ({...data[key], id: key}));
            
            // LANGKAH 1: Scan dulu semua Kepala Keluarga untuk mengisi kkLookup
            rawArray.forEach(item => {
                const no_kk = String(item.No_KK || item.no_kk || '').trim();
                const status = item.Hub_Keluarga || item.status || '';
                
                if (no_kk && (status === 'Kepala Keluarga')) {
                    kkLookup[no_kk] = {
                        no_kk: no_kk, // Pastikan No KK tersimpan
                        nama_kk: item.Nama_Lengkap || item.nama || item.Nama_KK || '',
                        alamat: item.Alamat || item.alamat || '',
                        rt: item.RT || item.rt || '',
                        rw: item.RW || item.rw || ''
                    };
                }
            });

            // LANGKAH 2: Map data warga, isi data kosong dengan data dari kkLookup
            loadedWarga = rawArray.map((item, index) => {
                const nik = item.NIK || item.nik || `item-${index}`;
                const no_kk = String(item.No_KK || item.no_kk || '').trim();
                
                // Ambil data dari lookup jika ada, jika tidak pakai data item itu sendiri
                const lookupData = kkLookup[no_kk] || {};
                
                return {
                    id: item.id || nik, 
                    nik: nik,
                    // Gunakan No KK dari lookup jika item.no_kk kosong tapi terhubung, atau pakai item.no_kk
                    no_kk: no_kk || lookupData.no_kk || '', 
                    nama_kk: (item.Nama_KK || item.nama_kk || lookupData.nama_kk || '').trim(),
                    rt: item.RT || item.rt || lookupData.rt || '06',
                    rw: item.RW || item.rw || lookupData.rw || '19',
                    alamat: item.Alamat || item.alamat || lookupData.alamat || 'Kp. Cikadu',
                    nama: (item.Nama_Lengkap || item.nama || '').trim(),
                    status: item.Hub_Keluarga || item.status || 'Warga',
                    tempat_lahir: item.Tmpt_lahir || item.tempat_lahir || '',
                    jenis_kelamin: item.L_P || item.jenis_kelamin || '',
                    tgl_lahir: item.Tgl_Lahir || item.tgl_lahir || '',
                    agama: item.Agama || item.agama || '',
                    gol_darah: item.Gol_Darah || item.gol_darah || '-',
                    pendidikan: item.Pendidikan_Terakhir || item.pendidikan || '',
                    status_kawin: item.Status_Perkawinan || item.status_kawin || '',
                    pekerjaan: item.Pekerjaan || item.pekerjaan || '',
                    is_dead: item.is_dead === true,
                    is_yatim: item.is_yatim || false,
                    is_duafa: item.is_duafa || false,
                    ...item
                };
            });
            
            // LANGKAH 3: Fallback terakhir (Isi bawah berdasarkan atas jika diurutkan)
            // Ini untuk kasus di mana data mungkin tidak lengkap di scan pertama
            let lastNoKK = '';
            loadedWarga.forEach(w => {
                if (w.no_kk && w.no_kk.trim() !== '') {
                    lastNoKK = w.no_kk;
                } else {
                    w.no_kk = lastNoKK;
                }
            });

            loadedWarga.sort((a, b) => 
                (a.nama || '').toLowerCase().localeCompare((b.nama || '').toLowerCase())
            );
        }
        setWarga(loadedWarga);
        setLoading(false);
    }, (error) => { setLoading(false); showToast("Gagal memuat data.", 'error'); });
    return () => unsubscribe(); 
  }, [ showToast ]); 

  const statistics = useMemo(() => { 
      const hidupWarga = warga.filter(w => !w.is_dead); 
      const stats = { total: warga.length, hidup: hidupWarga.length, meninggal: warga.filter(w => w.is_dead).length, yatim: hidupWarga.filter(w => w.is_yatim).length, duafa: hidupWarga.filter(w => w.is_duafa).length, kepala_keluarga: hidupWarga.filter(w => w.status === "Kepala Keluarga").length, istri: hidupWarga.filter(w => w.status === "Istri").length, anak: hidupWarga.filter(w => w.status === "Anak").length, usia: { "Balita": 0, "Anak-anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0 } }; 
      hidupWarga.forEach(w => { const age = getAge(w.tgl_lahir); const category = getAgeCategory(age); if (stats.usia[category] !== undefined) { stats.usia[category]++; } }); 
      return stats; 
  }, [warga]);

  const handleSaveToFirebase = useCallback(async (data) => {
    const isUpdating = !!data.id;
    const idToUse = isUpdating ? data.id : data.nik.toString();
    const personToSave = { Nama_Lengkap: data.nama, NIK: data.nik, No_KK: data.no_kk, Nama_KK: data.nama_kk || '', RT: data.rt || '06', RW: data.rw || '19', Alamat: data.alamat || '', Hub_Keluarga: data.status, Tmpt_lahir: data.tempat_lahir, L_P: data.jenis_kelamin, Tgl_Lahir: data.tgl_lahir, Agama: data.agama, Gol_Darah: data.gol_darah || '-', Pendidikan_Terakhir: data.pendidikan, Status_Perkawinan: data.status_kawin || '-', Pekerjaan: data.pekerjaan, is_dead: data.is_dead || false, is_yatim: data.is_yatim || false, is_duafa: data.is_duafa || false };
    try { await set(ref(database, `warga/${idToUse}`), personToSave); showToast("Data disimpan!", 'success'); setModalState({ type: null, data: null }); } catch (e) { showToast("Gagal simpan.", 'error'); }
  }, [showToast]);
  
  const handleAddFamily = useCallback(async (data) => { 
      try { const updates = {}; data.forEach(person => { const newId = person.nik.toString(); updates[`warga/${newId}`] = { Nama_Lengkap: person.nama, NIK: person.nik, No_KK: person.no_kk, Nama_KK: person.nama_kk || '', RT: person.rt || '06', RW: person.rw || '19', Alamat: person.alamat || '', Hub_Keluarga: person.status, Tmpt_lahir: person.tempat_lahir, L_P: person.jenis_kelamin, Tgl_Lahir: person.tgl_lahir, Agama: person.agama, Gol_Darah: person.gol_darah || '-', Pendidikan_Terakhir: person.pendidikan, Status_Perkawinan: person.status_kawin || '-', Pekerjaan: person.pekerjaan, is_dead: false }; }); await update(ref(database), updates); setModalState({ type: null }); showToast(`Keluarga ditambahkan!`, 'success'); } catch (error) { showToast("Gagal tambah keluarga.", 'error'); }
  }, [showToast]);

  const handleDelete = useCallback(async () => { if(modalState.data?.id) await remove(ref(database, `warga/${modalState.data.id}`)); setModalState({ type: null }); showToast("Dihapus!", 'success'); }, [modalState.data, showToast]);
  
  const filteredWarga = useMemo(() => {
    let baseWarga = warga;
    if (searchTerm) { const lowercasedTerm = searchTerm.toLowerCase(); baseWarga = baseWarga.filter((w) => (w.nama || '').toLowerCase().includes(lowercasedTerm) || (w.no_kk || '').includes(searchTerm) || (w.nik || '').includes(searchTerm) ); }
    if (ageFilter) { const statusKeluarga = ["Kepala Keluarga", "Istri", "Anak"]; const usiaKategori = ["Balita", "Anak-anak", "Remaja", "Dewasa", "Lansia"]; if (ageFilter === 'Meninggal') { return baseWarga.filter(w => w.is_dead); } const hidupWarga = baseWarga.filter(w => !w.is_dead); if (ageFilter === 'Yatim') { return hidupWarga.filter(w => w.is_yatim); } if (ageFilter === 'Duafa') { return hidupWarga.filter(w => w.is_duafa); } if (statusKeluarga.includes(ageFilter)) { return hidupWarga.filter(w => w.status === ageFilter); } if (usiaKategori.includes(ageFilter)) { return hidupWarga.filter(w => getAgeCategory(getAge(w.tgl_lahir)) === ageFilter); } return hidupWarga; }
    return baseWarga;
  }, [searchTerm, warga, ageFilter]);

  // --- EXPORT PDF ---
  const handleExportPDF = () => {
      if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
      const logo = new Image(); logo.src = '/logo-rt.png'; 
      logo.onload = () => {
          const doc = new jsPDF('landscape');
          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.width;
          const pageHeight = pageSize.height;
          const tableColumn = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub. Keluarga", "RT", "RW", "Jenis Kelamin", "Gol. Darah", "Tempat Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan" ];
          const tableRows = filteredWarga.map((w, index) => [ index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan ]);
          const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
          const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
          autoTable(doc, {
              head: [tableColumn], body: tableRows, startY: 50, theme: 'grid',
              styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
              headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7, lineColor: [68, 113, 196] },
              alternateRowStyles: { fillColor: [242, 242, 242] },
              columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 24 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { cellWidth: 15 }, 5: { cellWidth: 8, halign: 'center' }, 6: { cellWidth: 8, halign: 'center' }, 7: { cellWidth: 15 }, 8: { cellWidth: 10, halign: 'center' }, 9: { cellWidth: 18 }, 10: { cellWidth: 15, halign: 'center' }, 11: { cellWidth: 8, halign: 'center' }, 12: { cellWidth: 'auto' }, 13: { cellWidth: 'auto' } },
              didDrawPage: (data) => {
                  doc.addImage(logo, 'PNG', 15, 10, 25, 25);
                  doc.setFont("times", "bold"); doc.setFontSize(14); doc.text("KETUA RT. 006 RW. 019", pageWidth / 2, 16, { align: 'center' });
                  doc.setFontSize(16); doc.text("DESA DAYEUH", pageWidth / 2, 24, { align: 'center' });
                  doc.setFontSize(18); doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 32, { align: 'center' });
                  doc.setFont("times", "normal"); doc.setFontSize(8); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 38, { align: 'center' });
                  doc.setLineWidth(1); doc.line(10, 42, pageWidth - 10, 42);
                  doc.setFontSize(8); doc.setTextColor(100); doc.text(`Waktu Export: ${exportTime}`, pageWidth - 10, 48, { align: 'right' }); doc.text(filterText, 10, 48, { align: 'left' });
                  doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(data.settings.margin.left, pageHeight - 10, pageWidth - data.settings.margin.right, pageHeight - 10);
                  doc.setFontSize(8); doc.setTextColor(100); doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - data.settings.margin.right, pageHeight - 5, { align: 'right' }); doc.text("Sistem Administrasi RT Kp. Cikadu", data.settings.margin.left, pageHeight - 5);
              },
              margin: { top: 50, bottom: 15, left: 10, right: 10 }
          });
          doc.save(`Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.pdf`);
      };
      logo.onerror = () => { showToast("Gagal memuat file logo. Pastikan logo-rt.png ada di folder public.", "error"); };
  };
  
  // --- EXPORT EXCEL (EXCELJS - STYLING PDF) ---
  const handleExportExcel = async () => {
    if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
    const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Warga');
    const kopRows = [ ["KETUA RT. 006 RW. 019"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"] ];
    kopRows.forEach((row, index) => { const currentRow = worksheet.getRow(index + 1); currentRow.values = [row[0]]; worksheet.mergeCells(`A${index + 1}:N${index + 1}`); currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; if (index === 0) currentRow.getCell(1).font = { bold: true, size: 14, name: 'Times New Roman' }; else if (index === 1) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 2) currentRow.getCell(1).font = { bold: true, size: 18, name: 'Times New Roman' }; else currentRow.getCell(1).font = { size: 10, name: 'Times New Roman' }; });
    worksheet.getRow(5).values = [""]; worksheet.mergeCells('A5:N5'); worksheet.getCell('A5').border = { bottom: { style: 'medium' } };
    worksheet.getRow(6).values = [filterText, "", "", "", "", "", "", "", "", "", "", "", "", `Export: ${exportTime}`]; worksheet.mergeCells('A6:D6'); worksheet.mergeCells('N6:N6'); worksheet.getCell('A6').font = { bold: true }; worksheet.getCell('N6').alignment = { horizontal: 'right' }; worksheet.getCell('N6').font = { bold: true };
    const headerRow = worksheet.getRow(8); headerRow.values = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub. Keluarga", "RT", "RW", "Jenis Kelamin", "Gol. Darah", "Tmpt Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan" ];
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    filteredWarga.forEach((w, index) => { const rowValues = [ index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan ]; const row = worksheet.addRow(rowValues); row.eachCell((cell, colNumber) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; if ([1, 6, 7, 9, 11, 12].includes(colNumber)) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; } else { cell.alignment = { vertical: 'middle', horizontal: 'left' }; } }); });
    worksheet.columns = [ { width: 5 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 15 }, { width: 6 }, { width: 6 }, { width: 15 }, { width: 10 }, { width: 18 }, { width: 15 }, { width: 6 }, { width: 25 }, { width: 20 } ];
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); window.URL.revokeObjectURL(url);
  };

  const startIndex = (currentPage - 1) * dataPerPage;
  const currentWarga = filteredWarga.slice(startIndex, startIndex + dataPerPage);
  const totalPages = Math.ceil(filteredWarga.length / dataPerPage);
  const emptyWarga = { id: null, no_kk: "", nama_kk: "", nik: "", nama: "", jenis_kelamin: "L", rt:"06", rw:"19", alamat:"Kp. Cikadu", gol_darah: "-" };

  return (
    <div>
        {/* FILTER & CONTROLS RESPONSIVE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <input type="text" placeholder="Cari berdasarkan Nama, NIK, atau No. KK..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={{...inputStyle, width: '100%', maxWidth:'300px'}} />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                    <button onClick={() => setModalState({ type: 'addFamily', data: emptyWarga })} style={buttonStyle.addFamily}>+ Tambah Keluarga</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={buttonStyle.exportTrigger}>
                            📤 Export Data ▼
                        </button>
                        {showExportMenu && (
                            <div style={buttonStyle.dropdownMenu} onMouseLeave={() => setShowExportMenu(false)}>
                                <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#ff4d4f'}}>
                                    📄 Export PDF
                                </button>
                                <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#00c853'}}>
                                    📊 Export Excel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
             </div>

             <div style={{ padding: '1rem', background: 'rgba(0, 170, 255, 0.03)', border: '1px solid rgba(0, 170, 255, 0.1)', borderRadius: '10px' }}>
               <label style={{ color: '#00eaff', marginBottom: '0.5rem', display: 'block', fontWeight: '600', fontSize: '0.85rem' }}>Filter Statistik:</label>
               
               <div style={{ position: 'relative', display: 'inline-block' }}>
                 <select value={ageFilter || ""} onChange={(e) => setAgeFilter(e.target.value === "" ? null : e.target.value)} style={selectCompactStyle}>
                    <option value="" style={{color: '#fff', background: '#222'}}>👥 Semua Warga (Hidup) — {statistics.hidup}</option>
                    <optgroup label="Status Keluarga" style={{color: '#00ff88', background: '#1a1a1a'}}>
                         <option value="Kepala Keluarga" style={{color: '#fff', background: '#222'}}>🏠 Kepala Keluarga — {statistics.kepala_keluarga}</option>
                         <option value="Istri" style={{color: '#fff', background: '#222'}}>👩 Istri — {statistics.istri}</option>
                         <option value="Anak" style={{color: '#fff', background: '#222'}}>👶 Anak — {statistics.anak}</option>
                    </optgroup>
                    <optgroup label="Berdasarkan Usia (Standar Pemerintah)" style={{color: '#00aaff', background: '#1a1a1a'}}>
                        <option value="Balita" style={{color: '#fff', background: '#222'}}>👶 Balita (0-5 th) — {statistics.usia["Balita"]}</option>
                        <option value="Anak-anak" style={{color: '#fff', background: '#222'}}>👦 Anak-anak (6-11 th) — {statistics.usia["Anak-anak"]}</option>
                        <option value="Remaja" style={{color: '#fff', background: '#222'}}>🧑 Remaja (12-25 th) — {statistics.usia["Remaja"]}</option>
                        <option value="Dewasa" style={{color: '#fff', background: '#222'}}>👩 Dewasa (26-59 th) — {statistics.usia["Dewasa"]}</option>
                        <option value="Lansia" style={{color: '#fff', background: '#222'}}>🧓 Lansia ({'>'}60 th) — {statistics.usia["Lansia"]}</option>
                    </optgroup>
                    <optgroup label="Kategori Sosial" style={{color: '#ffaa00', background: '#1a1a1a'}}>
                         <option value="Yatim" style={{color: '#fff', background: '#222'}}>👤 Yatim — {statistics.yatim}</option>
                         <option value="Duafa" style={{color: '#fff', background: '#222'}}>💰 Duafa — {statistics.duafa}</option>
                    </optgroup>
                    <optgroup label="Status Lainnya" style={{color: '#ff4d4f', background: '#1a1a1a'}}>
                        <option value="Meninggal" style={{color: '#fff', background: '#222'}}>⚰️ Meninggal — {statistics.meninggal}</option>
                    </optgroup>
                 </select>
                 <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#00eaff', fontSize: '0.7rem' }}>▼</span>
               </div>
            </div>
        </div>

        {/* TABEL WEB: NOWRAP */}
        <div style={{ overflowX: 'auto', background: "rgba(10,10,10,0.4)", borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1800px', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>No</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>No KK</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>NIK</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Nama Lengkap</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Hub Keluarga</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap', textAlign: 'center'}}>RT</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap', textAlign: 'center'}}>RW</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>L/P</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Gol.Darah</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Usia</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Pekerjaan</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="15" style={{textAlign: 'center', padding: '2rem', color: '#555'}}>Memuat data...</td></tr>
                    ) : currentWarga.map((w, i) => (
                        <tr key={w.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0, 170, 255, 0.05)' : 'transparent' }}>
                            <td style={{padding:'8px', textAlign:'center', color:'#666', whiteSpace: 'nowrap'}}>{startIndex + i + 1}</td>
                            <td style={{padding:'8px', color:'#bbb', whiteSpace: 'nowrap'}}>{w.no_kk}</td>
                            <td style={{padding:'8px', color:'#bbb', whiteSpace: 'nowrap'}}>{w.nik}</td>
                            <td style={{padding:'8px', color: w.is_dead ? '#ff4d4f' : '#fff', fontWeight:'500', whiteSpace: 'nowrap'}}>{w.nama}</td>
                            <td style={{padding:'8px', color:'#00ff88', whiteSpace: 'nowrap'}}>{w.status}</td>
                            <td style={{padding:'8px', color:'#bbb', whiteSpace: 'nowrap', textAlign: 'center'}}>{w.rt}</td>
                            <td style={{padding:'8px', color:'#bbb', whiteSpace: 'nowrap', textAlign: 'center'}}>{w.rw}</td>
                            <td style={{padding:'8px', color:'#00eaff', whiteSpace: 'nowrap'}}>{w.jenis_kelamin}</td>
                            <td style={{padding:'8px', color:'#bbb', textAlign:'center', whiteSpace: 'nowrap'}}>{w.gol_darah}</td>
                            <td style={{padding:'8px', color:'#fff', textAlign:'center', whiteSpace: 'nowrap'}}>{getAge(w.tgl_lahir)}</td>
                            <td style={{padding:'8px', color:'#bbb', whiteSpace: 'nowrap'}}>{w.pekerjaan}</td>
                            <td style={{padding:'8px', textAlign:'center', display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                                <button onClick={() => setModalState({ type: 'edit', data: { ...w, tgl_lahir: formatDateForInput(w.tgl_lahir) } })} style={{color:'#00aaff', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Edit</button>
                                <button onClick={() => setModalState({ type: 'delete', data: w })} style={{color:'#ff4d4f', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>Hapus</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* PAGINASI */}
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

        <Modal isOpen={modalState.type === 'addFamily'} onClose={() => setModalState({ type: null, data: null })} maxWidth="95%"><FamilyForm onSave={handleAddFamily} onCancel={() => setModalState({ type: null, data: null })} existingWarga={warga} /></Modal>
        <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={() => setModalState({ type: null, data: null })} maxWidth="800px"><PersonForm initialData={modalState.data || emptyWarga} onSave={handleSaveToFirebase} onCancel={() => setModalState({ type: null, data: null })} isEdit={modalState.type === 'edit'} existingWarga={warga} /></Modal>
        <Modal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null, data: null })} maxWidth="400px"><ConfirmationModal onConfirm={handleDelete} onCancel={() => setModalState({ type: null, data: null })} title="Konfirmasi Hapus" message="Hapus data?" confirmText="Hapus" confirmStyle={buttonStyle.delete} /></Modal>
        <ToastNotification message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
}