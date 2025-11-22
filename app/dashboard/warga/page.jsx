"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from 'exceljs';

// --- IMPORT FIRESTORE ---
import { db, collection, onSnapshot, doc, setDoc, deleteDoc } from '@/lib/firebase'; 
// -----------------------

// --- KONFIGURASI SPREADSHEET ---
// GANTI URL INI DENGAN URL DARI GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxC1mczeiH1F2oX9V_vAl5qZCrq7ILWg8MtD_rzzhiyCivLonbbJag6WD8Cmvq0YrSPAA/exec"; 
// -------------------------------

// --- STYLE ---
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

// --- HELPER ---
const getAge = (dateString) => {
    if (!dateString) return null;
    let birthDate;
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        birthDate = d;
    } catch (e) { return null; }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};

const getAgeCategory = (age) => { 
    if (age === null || isNaN(age) || age < 0) return "Tidak Diketahui"; 
    if (age <= 5) return "Balita"; if (age <= 11) return "Anak-anak"; if (age <= 25) return "Remaja"; if (age <= 45) return "Dewasa"; return "Lansia";                    
};

const formatTableDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getKategoriText = (w) => {
    if (w.is_dead) return "MENINGGAL";
    const cats = [];
    if (w.is_yatim) cats.push("Yatim/Piatu");
    if (w.is_duafa) cats.push("Duafa");
    return cats.length > 0 ? cats.join(", ") : "Warga Biasa";
};

// --- MODAL & TOAST ---
const Modal = ({ isOpen, onClose, children, maxWidth = "600px" }) => { 
    const [m,sM]=useState(false); 
    useEffect(()=>sM(true),[]); 
    if(!m||!isOpen)return null; 
    return ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:'blur(5px)',padding:'1rem'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"#161616",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"1.5rem",width:"100%",maxWidth:maxWidth, maxHeight:'90vh', overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    ); 
};

const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle }) => ( 
    <div> 
        <h3 style={{color:confirmStyle.color,textAlign:'center',marginTop:0}}>{title}</h3> 
        <p style={{textAlign:'center',color:'#aaa',margin:'1.5rem 0'}}>{message}</p> 
        <div style={{display:'flex',justifyContent:'center',gap:'1rem'}}> 
            <button onClick={onCancel} style={buttonStyle.cancel}>Batal</button> 
            <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button> 
        </div> 
    </div> 
);

const ToastNotification = ({ message, type, isVisible, onClose }) => { 
    const [m,sM]=useState(false); 
    useEffect(()=>sM(true),[]); 
    if(!m)return null; 
    const col=type==='success'?'#00ff88':'#ff4d4f'; 
    return ReactDOM.createPortal(
        <div style={{position:'fixed',top:'20px',left:'50%',transform:isVisible?'translate(-50%,0)':'translate(-50%,-200%)',background:`${col}1A`,border:`1px solid ${col}80`,color:'#fff',padding:'0.75rem 1.5rem',borderRadius:'50px',zIndex:9999,opacity:isVisible?1:0,transition:'all 0.5s',backdropFilter:'blur(12px)'}}>
            {message}
        </div>,
        document.body
    ); 
};

// --- PERSON FORM ---
const PersonForm = ({ initialData, onSave, onCancel, isEdit = false }) => { 
    const defaultForm = { nama: "", nik: "", no_kk: "", nama_kk: "", rt: "06", rw: "19", alamat: "Kp. Cikadu", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", gol_darah: "-", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", status: "Warga", is_yatim: false, is_duafa: false, is_dead: false };
    const [formData, setFormData] = useState({ ...defaultForm, ...initialData });

    useEffect(() => { setFormData({ ...defaultForm, ...initialData }); }, [initialData]);
    
    const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }; 
    const handleSubmit = (e) => { e.preventDefault(); if (!formData.nama || !formData.nik) { alert('Nama dan NIK wajib diisi!'); return; } onSave(formData); }; 
    
    return ( 
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}> 
            <h2 style={{color:'#00eaff',margin:0,fontSize:'1.2rem'}}>{isEdit?'Edit Data Warga':'Tambah Data Warga'}</h2> 
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'0.8rem'}}> 
                <input name="nama" value={formData.nama||""} onChange={handleChange} placeholder="Nama Lengkap*" required style={inputStyle} /> 
                <input name="nik" value={formData.nik||""} onChange={handleChange} placeholder="NIK*" required style={inputStyle} /> 
                <input name="no_kk" value={formData.no_kk||""} onChange={handleChange} placeholder="No. KK*" required style={inputStyle} /> 
                <input name="nama_kk" value={formData.nama_kk||""} onChange={handleChange} placeholder="Nama Kepala Keluarga" style={inputStyle} /> 
                <div style={{display:'flex',gap:'0.5rem'}}> <input name="rt" value={formData.rt||""} onChange={handleChange} placeholder="RT" style={inputStyle} /> <input name="rw" value={formData.rw||""} onChange={handleChange} placeholder="RW" style={inputStyle} /> </div> 
                <input name="alamat" value={formData.alamat||""} onChange={handleChange} placeholder="Alamat" style={inputStyle} /> 
                <select name="jenis_kelamin" value={formData.jenis_kelamin||"L"} onChange={handleChange} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> 
                <input name="tempat_lahir" value={formData.tempat_lahir||""} onChange={handleChange} placeholder="Tempat Lahir" style={inputStyle} /> 
                <input name="tgl_lahir" type="date" value={formData.tgl_lahir||""} onChange={handleChange} style={{...inputStyle,colorScheme:'dark'}} /> 
                <input name="agama" value={formData.agama||""} onChange={handleChange} placeholder="Agama" style={inputStyle} /> 
                <select name="gol_darah" value={formData.gol_darah||"-"} onChange={handleChange} style={inputStyle}> {golDarahOptions.map(opt=><option key={opt} value={opt}>{opt}</option>)} </select> 
                <select name="pendidikan" value={formData.pendidikan||"Tidak/Belum Sekolah"} onChange={handleChange} style={inputStyle}>{pendidikanOptions.map(opt=><option key={opt} value={opt}>{opt}</option>)}</select> 
                <input name="pekerjaan" value={formData.pekerjaan||""} onChange={handleChange} placeholder="Pekerjaan" style={inputStyle} /> 
                <select name="status" value={formData.status||"Warga"} onChange={handleChange} style={inputStyle}> <option value="Kepala Keluarga">Kepala Keluarga</option> <option value="Istri">Istri</option> <option value="Anak">Anak</option> <option value="Warga">Warga</option> </select> 
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',padding:'0.75rem',background:'rgba(0,0,0,0.4)',border:'1px solid #333',borderRadius:'6px'}}> 
                    <label style={{color:'#ccc'}}><input name="is_yatim" type="checkbox" checked={formData.is_yatim||false} onChange={handleChange} /> Yatim/Piatu</label> 
                    <label style={{color:'#ccc'}}><input name="is_duafa" type="checkbox" checked={formData.is_duafa||false} onChange={handleChange} /> Duafa</label> 
                    <label style={{color:'#ff4d4f'}}><input name="is_dead" type="checkbox" checked={formData.is_dead||false} onChange={handleChange} /> Meninggal Dunia</label> 
                </div> 
            </div> 
            <div style={{display:'flex',justifyContent:'flex-end',gap:'1rem'}}> <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button type="submit" style={buttonStyle.save}>Simpan</button> </div> 
        </form> 
    ); 
};

// --- FAMILY FORM ---
const FamilyForm = ({ onSave, onCancel }) => { 
    const [no_kk, setNoKk] = useState(""); const [nama_kk, setNamaKk] = useState(""); const [alamat, setAlamat] = useState("Kp. Cikadu"); const [rt, setRt] = useState("06"); const [rw, setRw] = useState("19");
    const defP = { nama: "", nik: "", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", gol_darah: "-", is_dead: false, is_yatim: false, is_duafa: false }; 
    const [kk, setKk] = useState({...defP, status:"Kepala Keluarga", status_kawin:"Kawin"}); const [istri, setIstri] = useState({...defP, jenis_kelamin:"P", status:"Istri", status_kawin:"Kawin"}); const [anak, setAnak] = useState([{...defP, status:"Anak"}]); 
    
    const handleKepalakeluargaChange = (e) => { const { name, value, type, checked } = e.target; setKk(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); if(name === 'nama') setNamaKk(value); }; 
    const handleIstriChange = (e) => { const { name, value, type, checked } = e.target; setIstri(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); }; 
    const handleAnakChange = (index, e) => { const { name, value, type, checked } = e.target; const newAnak = [...anak]; newAnak[index] = { ...newAnak[index], [name]: type === 'checkbox' ? checked : value }; setAnak(newAnak); }; 
    const handleAddAnak = () => { setAnak(prev => [...prev, { ...defP, status: "Anak" }]); }; 
    const handleRemoveAnak = (index) => { setAnak(prev => prev.filter((_, i) => i !== index)); }; 
    const handleSubmit = (e) => { e.preventDefault(); if (!no_kk || !kk.nama || !kk.nik) { alert('Data Kepala Keluarga wajib diisi!'); return; } const fam = [{...kk, no_kk, nama_kk, alamat, rt, rw}]; if(istri.nama && istri.nik) fam.push({...istri, no_kk, nama_kk, alamat, rt, rw}); anak.forEach(a => { if(a.nama && a.nik) fam.push({...a, no_kk, nama_kk, alamat, rt, rw}); }); onSave(fam); }; 
    
    return ( <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}> <h2 style={{ color: '#00eaff', margin: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>Input Data Keluarga</h2> <div style={{ paddingBottom: '1rem', borderBottom: '2px solid rgba(0, 255, 136, 0.3)' }}> <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem'}}> <input name="no_kk" value={no_kk} onChange={(e) => setNoKk(e.target.value)} placeholder="Nomor KK*" required style={inputStyle} /> <input name="nama_kk" value={nama_kk} onChange={(e) => setNamaKk(e.target.value)} placeholder="Nama Kepala Keluarga" style={inputStyle} /> </div> <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem'}}> <input name="rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="RT" style={inputStyle} /> <input name="rw" value={rw} onChange={(e) => setRw(e.target.value)} placeholder="RW" style={inputStyle} /> <input name="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" style={inputStyle} /> </div> </div> <div style={{ borderLeft: '3px solid #00ff88', paddingLeft: '1rem' }}> <h3 style={{ color: '#00ff88', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Kepala Keluarga *</h3> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={kk.nama} onChange={handleKepalakeluargaChange} placeholder="Nama Lengkap*" required style={inputStyle} /> <input name="nik" value={kk.nik} onChange={handleKepalakeluargaChange} placeholder="NIK*" required style={inputStyle} /> <select name="jenis_kelamin" value={kk.jenis_kelamin} onChange={handleKepalakeluargaChange} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> <input name="tempat_lahir" value={kk.tempat_lahir} onChange={handleKepalakeluargaChange} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={kk.tgl_lahir} onChange={handleKepalakeluargaChange} style={{...inputStyle, colorScheme: 'dark'}} /> <input name="agama" value={kk.agama} onChange={handleKepalakeluargaChange} placeholder="Agama" style={inputStyle} /> <select name="gol_darah" value={kk.gol_darah} onChange={handleKepalakeluargaChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={kk.pendidikan} onChange={handleKepalakeluargaChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> <input name="pekerjaan" value={kk.pekerjaan} onChange={handleKepalakeluargaChange} placeholder="Pekerjaan" style={inputStyle} /> </div> </div> <div style={{ borderLeft: '3px solid #ff80ed', paddingLeft: '1rem' }}> <h3 style={{ color: '#ff80ed', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Istri (Opsional)</h3> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={istri.nama} onChange={handleIstriChange} placeholder="Nama Lengkap" style={inputStyle} /> <input name="nik" value={istri.nik} onChange={handleIstriChange} placeholder="NIK" style={inputStyle} /> <input name="tempat_lahir" value={istri.tempat_lahir} onChange={handleIstriChange} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={istri.tgl_lahir} onChange={handleIstriChange} style={{...inputStyle, colorScheme: 'dark'}} /> <input name="agama" value={istri.agama} onChange={handleIstriChange} placeholder="Agama" style={inputStyle} /> <select name="gol_darah" value={istri.gol_darah} onChange={handleIstriChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={istri.pendidikan} onChange={handleIstriChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> <input name="pekerjaan" value={istri.pekerjaan} onChange={handleIstriChange} placeholder="Pekerjaan" style={inputStyle} /> </div> </div> <div style={{ borderLeft: '3px solid #ffaa00', paddingLeft: '1rem' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '1rem', flexWrap: 'wrap' }}> <h3 style={{ color: '#ffaa00', margin: 0, fontSize: '0.95rem' }}>Anak (Opsional)</h3> <button type="button" onClick={handleAddAnak} style={{ ...buttonStyle.save, padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}> + Tambah Anak </button> </div> {anak.map((anakItem, index) => ( <div key={index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 170, 0, 0.2)' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}> <span style={{ color: '#ffaa00', fontWeight: '500', fontSize: '0.8rem' }}>Anak {index + 1}</span> <button type="button" onClick={() => handleRemoveAnak(index)} style={{ ...buttonStyle.delete, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}> Hapus </button> </div> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}> <input name="nama" value={anakItem.nama} onChange={(e) => handleAnakChange(index, e)} placeholder="Nama" style={inputStyle} /> <input name="nik" value={anakItem.nik} onChange={(e) => handleAnakChange(index, e)} placeholder="NIK" style={inputStyle} /> <select name="jenis_kelamin" value={anakItem.jenis_kelamin} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select> <input name="tempat_lahir" value={anakItem.tempat_lahir} onChange={(e) => handleAnakChange(index, e)} placeholder="Tmpt Lahir" style={inputStyle} /> <input name="tgl_lahir" type="date" value={anakItem.tgl_lahir} onChange={(e) => handleAnakChange(index, e)} style={{...inputStyle, colorScheme: 'dark'}} /> <select name="gol_darah" value={anakItem.gol_darah} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> <select name="pendidikan" value={anakItem.pendidikan} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> <input name="pekerjaan" value={anakItem.pekerjaan} onChange={(e) => handleAnakChange(index, e)} placeholder="Pekerjaan" style={inputStyle} /> </div> </div> ))} </div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap-reverse' }}> <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button> <button type="submit" style={buttonStyle.save}>Simpan Keluarga</button> </div> </form> ); };

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

  // --- REALTIME LISTENER (FIRESTORE) ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "warga"), (snap) => {
        const list = snap.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id,
                ...d, 
                nama: d.nama || d.Nama || d.NAMA || d.nama_lengkap || d['Nama Lengkap'] || "(Tanpa Nama)",
                nik: String(d.nik || d.NIK || d.Nik || "-"),
                no_kk: String(d.no_kk || d.No_KK || d.KK || d.kk || "-"),
                alamat: d.alamat || d.Alamat || "Kp. Cikadu",
                rt: String(d.rt || d.RT || "06"),
                rw: String(d.rw || d.RW || "19"),
                jenis_kelamin: d.jenis_kelamin || d.Jenis_Kelamin || d.LP || d.L_P || "L",
                gol_darah: d.gol_darah || d.Gol_Darah || d.darah || "-",
                tgl_lahir: d.tgl_lahir || d.Tgl_Lahir || d.Tanggal_Lahir || "",
                tempat_lahir: d.tempat_lahir || d.Tempat_Lahir || "",
                pekerjaan: d.pekerjaan || d.Pekerjaan || "-",
                status: d.status || d.Status || d.Hubungan || d.SHDK || d['Hub Keluarga'] || "Warga",
                agama: d.agama || d.Agama || "Islam",
                pendidikan: d.pendidikan || d.Pendidikan || "-"
            };
        });

        const rolePriority = { "Kepala Keluarga": 1, "Istri": 2, "Anak": 3 };
        list.sort((a, b) => {
            const kkA = String(a.no_kk || ''); 
            const kkB = String(b.no_kk || '');
            if (kkA < kkB) return -1;
            if (kkA > kkB) return 1;
            const roleA = rolePriority[a.status] || 99;
            const roleB = rolePriority[b.status] || 99;
            return roleA - roleB;
        });

        setWarga(list);
        setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub(); 
  }, []); 

  // --- FUNGSI SYNC SPREADSHEET (BACKUP OTOMATIS) ---
  const syncToSheet = async (data) => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_URL")) return; 
      try {
          // KRUSIAL: UBAH L/P MENJADI LENGKAP SEBELUM DIKIRIM KE SPREADSHEET
          const spreadsheetData = {
              ...data,
              jenis_kelamin: data.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'
          };

          await fetch(GOOGLE_SCRIPT_URL, {
              method: "POST",
              mode: "no-cors", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(spreadsheetData) // Kirim data yang sudah diformat
          });
          console.log("Sync to Sheet sent.");
      } catch (e) {
          console.error("Gagal backup ke Sheet", e);
      }
  };

  // --- CRUD ---
  const handleSave = async (data) => {
      if (!data.nik) return showToast("NIK Wajib diisi", "error");
      const docId = String(data.nik);
      try {
          await setDoc(doc(db, "warga", docId), data);
          syncToSheet(data);
          showToast("Data tersimpan & Backup OK!", 'success');
          setModalState({ type: null, data: null });
      } catch(e) { showToast("Gagal simpan", 'error'); }
  };

  const handleAddFamily = async (dataFamily) => {
      try {
          const batchPromises = dataFamily.map(person => {
              syncToSheet(person);
              return setDoc(doc(db, "warga", String(person.nik)), person);
          });
          await Promise.all(batchPromises);
          showToast("Keluarga ditambahkan & Backup OK!", 'success');
          setModalState({ type: null, data: null });
      } catch(e) { showToast("Gagal simpan keluarga", 'error'); }
  };

  const handleDelete = async () => {
      if(modalState.data?.id) {
          try {
              await deleteDoc(doc(db, "warga", modalState.data.id));
              showToast("Data dihapus", 'success');
          } catch(e) { showToast("Gagal hapus", 'error'); }
      }
      setModalState({ type: null, data: null });
  };

  const statistics = useMemo(() => { 
      const hidupWarga = warga.filter(w => !w.is_dead); 
      const stats = { total: warga.length, hidup: hidupWarga.length, meninggal: warga.filter(w => w.is_dead).length, yatim: hidupWarga.filter(w => w.is_yatim).length, duafa: hidupWarga.filter(w => w.is_duafa).length, kepala_keluarga: hidupWarga.filter(w => w.status === "Kepala Keluarga").length, istri: hidupWarga.filter(w => w.status === "Istri").length, anak: hidupWarga.filter(w => w.status === "Anak").length, usia: { "Balita": 0, "Anak-anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0 } }; 
      hidupWarga.forEach(w => { const age = getAge(w.tgl_lahir); const category = getAgeCategory(age); if (stats.usia[category] !== undefined) { stats.usia[category]++; } }); 
      return stats; 
  }, [warga]);

  const filteredWarga = useMemo(() => {
    let res = warga;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        res = res.filter(w => 
            (w.nama && w.nama.toLowerCase().includes(term)) || 
            (w.nik && String(w.nik).includes(term)) || 
            (w.no_kk && String(w.no_kk).includes(term))
        );
    }
    if (ageFilter) {
        if (ageFilter === 'Meninggal') res = res.filter(w => w.is_dead);
        else if (ageFilter === 'Yatim') res = res.filter(w => w.is_yatim);
        else if (ageFilter === 'Duafa') res = res.filter(w => w.is_duafa);
        else if (['Kepala Keluarga', 'Istri', 'Anak'].includes(ageFilter)) res = res.filter(w => w.status === ageFilter);
        else res = res.filter(w => getAgeCategory(getAge(w.tgl_lahir)) === ageFilter);
    }
    return res;
  }, [warga, searchTerm, ageFilter]);

  const startIndex = (currentPage - 1) * dataPerPage;
  const currentWarga = filteredWarga.slice(startIndex, startIndex + dataPerPage);
  const totalPages = Math.ceil(filteredWarga.length / dataPerPage);

  const emptyWarga = { id: null, nama: "", nik: "", no_kk: "", nama_kk: "", rt: "06", rw: "19", alamat: "Kp. Cikadu", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", gol_darah: "-", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", status: "Warga", is_yatim: false, is_duafa: false, is_dead: false };

  const handleExportPDF = () => {
      if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
      const logo = new Image(); logo.src = '/logo-rt.png'; 
      logo.onload = () => {
          const doc = new jsPDF('landscape');
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          
          // TABLE COLUMN (HEADER "Jenis Kelamin")
          const tableColumn = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub. Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Gol", "Tmpt Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan", "Kategori" ];
          const tableRows = filteredWarga.map((w, index) => [ 
              index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.alamat, w.rt, w.rw, 
              w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), 
              getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan, getKategoriText(w)
          ]);
          
          const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
          const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
          
          autoTable(doc, {
              head: [tableColumn], body: tableRows, startY: 50, theme: 'grid',
              styles: { fontSize: 7, cellPadding: 2, valign: 'middle', overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
              headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 7, lineColor: [68, 113, 196] },
              alternateRowStyles: { fillColor: [242, 242, 242] },
              // PERLEBAR NIK/KK JADI 26 AGAR TIDAK TERPOTONG
              columnStyles: { 
                  0: { cellWidth: 10, halign: 'center' }, // No
                  1: { cellWidth: 26, halign: 'center' }, // No KK (DIPERLEBAR)
                  2: { cellWidth: 26, halign: 'center' }, // NIK (DIPERLEBAR)
                  3: { cellWidth: 'auto' }, // Nama (Auto fill)
                  4: { cellWidth: 20 }, 
                  5: { cellWidth: 20 }, 
                  6: { cellWidth: 8, halign: 'center' }, 
                  7: { cellWidth: 8, halign: 'center' }, 
                  8: { cellWidth: 18, halign: 'center' }, // Jenis Kelamin
                  9: { cellWidth: 8, halign: 'center' }, 
                  10: { cellWidth: 20 }, 
                  11: { cellWidth: 18, halign: 'center' }, 
                  12: { cellWidth: 10, halign: 'center' }, // Usia
                  13: { cellWidth: 25 }, 
                  14: { cellWidth: 20 }, 
                  15: { cellWidth: 20 } 
              },
              didParseCell: (data) => { if (data.section === 'body') { const row = filteredWarga[data.row.index]; if (row && row.is_dead) { data.cell.styles.textColor = [255, 77, 79]; data.cell.styles.fontStyle = 'bold'; } } },
              didDrawPage: (data) => {
                  doc.addImage(logo, 'PNG', 15, 10, 25, 25);
                  doc.setFont("times", "bold"); doc.setFontSize(16); doc.text("KETUA RT. 06 RW. 19", pageWidth / 2, 16, { align: 'center' });
                  doc.setFontSize(16); doc.text("DESA DAYEUH", pageWidth / 2, 24, { align: 'center' });
                  doc.setFontSize(16); doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 32, { align: 'center' });
                  doc.setFont("times", "normal"); doc.setFontSize(9); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 38, { align: 'center' });
                  doc.setLineWidth(1); doc.line(10, 42, pageWidth - 10, 42);
                  doc.setFontSize(8); doc.setTextColor(100); doc.text(`Waktu Export: ${exportTime}`, pageWidth - 10, 48, { align: 'right' }); doc.text(filterText, 10, 48, { align: 'left' });
                  doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(data.settings.margin.left, pageHeight - 10, pageWidth - data.settings.margin.right, pageHeight - 10);
                  doc.setFontSize(8); doc.setTextColor(100); doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - data.settings.margin.right, pageHeight - 5, { align: 'right' }); doc.text("Sistem Administrasi RT Kp. Cikadu", data.settings.margin.left, pageHeight - 5);
              },
              margin: { top: 50, bottom: 15, left: 10, right: 10 }
          });
          doc.save(`Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.pdf`);
      };
      logo.onerror = () => { showToast("Gagal memuat file logo.", "error"); };
  };

  const handleExportExcel = async () => {
    if (!filteredWarga.length) { showToast("Data kosong.", "error"); return; }
    const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga';
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Warga');
    const kopRows = [ ["KETUA RT. 06 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"] ];
    kopRows.forEach((row, index) => { const currentRow = worksheet.getRow(index + 1); currentRow.values = [row[0]]; worksheet.mergeCells(`A${index + 1}:Q${index + 1}`); currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; if (index === 0) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 1) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 2) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else currentRow.getCell(1).font = { size: 10, name: 'Times New Roman' }; });
    worksheet.getRow(5).values = [""]; worksheet.mergeCells('A5:Q5'); worksheet.getCell('A5').border = { bottom: { style: 'medium' } };
    worksheet.getRow(6).values = [filterText, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Export: ${exportTime}`]; worksheet.mergeCells('A6:D6'); worksheet.mergeCells('Q6:Q6'); worksheet.getCell('A6').font = { bold: true }; worksheet.getCell('Q6').alignment = { horizontal: 'right' }; worksheet.getCell('Q6').font = { bold: true };
    const headerRow = worksheet.getRow(8); 
    
    // --- UPDATE HEADER EXCEL ---
    headerRow.values = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub. Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Gol", "Tmpt Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan", "Kategori" ];
    
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    filteredWarga.forEach((w, index) => { 
        // ISI DATA EXCEL (DIUBAH JADI Laki-laki / Perempuan)
        const rowValues = [ index + 1, w.no_kk, w.nik, w.nama + (w.is_dead ? " (Alm)" : ""), w.status, w.alamat, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan, getKategoriText(w) ]; 
        const row = worksheet.addRow(rowValues); 
        if (w.is_dead) { row.eachCell((cell) => { cell.font = { color: { argb: 'FFFF0000' } }; }); }
        row.eachCell((cell, colNumber) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; if ([1, 7, 8, 10, 12, 13].includes(colNumber)) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; } else { cell.alignment = { vertical: 'middle', horizontal: 'left' }; } }); 
    });
    worksheet.columns = [ { width: 5 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 6 }, { width: 6 }, { width: 15 }, { width: 5 }, { width: 15 }, { width: 15 }, { width: 6 }, { width: 25 }, { width: 20 }, { width: 20 } ];
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); window.URL.revokeObjectURL(url);
  };

  return (
    <div>
        {/* FILTER & CONTROLS RESPONSIVE */}
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
             <div style={{ padding: '1rem', background: 'rgba(0, 170, 255, 0.03)', border: '1px solid rgba(0, 170, 255, 0.1)', borderRadius: '10px' }}>
               <label style={{ color: '#00eaff', marginBottom: '0.5rem', display: 'block', fontWeight: '600', fontSize: '0.85rem' }}>Filter Statistik:</label>
               <select value={ageFilter || ""} onChange={(e) => setAgeFilter(e.target.value === "" ? null : e.target.value)} style={selectCompactStyle}> 
                   <option value="">👥 Semua Warga ({statistics.hidup})</option> 
                   <optgroup label="Status Keluarga"> 
                       <option value="Kepala Keluarga">🏠 Kepala Keluarga ({statistics.kepala_keluarga})</option> 
                       <option value="Istri">👩 Istri ({statistics.istri})</option> 
                       <option value="Anak">👶 Anak ({statistics.anak})</option> 
                   </optgroup> 
                   <optgroup label="Berdasarkan Usia (Kemenkes RI)"> 
                       <option value="Balita">👶 Balita (0-5 Thn) ({statistics.usia['Balita']})</option> 
                       <option value="Anak-anak">👦 Anak-anak (6-11 Thn) ({statistics.usia['Anak-anak']})</option> 
                       <option value="Remaja">🧑 Remaja (12-25 Thn) ({statistics.usia['Remaja']})</option> 
                       <option value="Dewasa">👩 Dewasa (26-45 Thn) ({statistics.usia['Dewasa']})</option> 
                       <option value="Lansia">🧓 Lansia (46+ Thn) ({statistics.usia['Lansia']})</option> 
                   </optgroup> 
                   <optgroup label="Kategori Sosial"> 
                       <option value="Yatim">👤 Yatim ({statistics.yatim})</option> 
                       <option value="Duafa">💰 Duafa ({statistics.duafa})</option> 
                   </optgroup> 
                   <optgroup label="Lainnya"> 
                       <option value="Meninggal">⚰️ Meninggal ({statistics.meninggal})</option> 
                   </optgroup> 
               </select>
            </div>
        </div>

        {/* TABEL RESPONSIVE */}
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
                        {/* HEADER WEB TABLE DIUBAH */}
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Jenis Kelamin</th>
                        <th style={{padding:'10px', color: '#00aaff', whiteSpace: 'nowrap'}}>Gol.Darah</th>
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
                    {loading ? ( 
                        <tr>
                            <td colSpan="17" style={{textAlign: 'center', padding: '2rem', color: '#555'}}>Memuat data...</td>
                        </tr> 
                    ) : currentWarga.map((w, i) => {
                        let statusKategori = "Warga Biasa";
                        let colorKategori = "#888"; 

                        if (w.is_dead) {
                            statusKategori = "MENINGGAL";
                            colorKategori = "#ff4d4f"; 
                        } else {
                            const cats = [];
                            if (w.is_yatim) cats.push("Yatim/Piatu");
                            if (w.is_duafa) cats.push("Duafa");
                            
                            if (cats.length > 0) {
                                statusKategori = cats.join(", ");
                                colorKategori = "#ffaa00"; 
                            }
                        }

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
                                {/* ISI TABEL WEB DIUBAH JADI Laki-laki / Perempuan */}
                                <td style={{padding:'8px', color:'#00eaff'}}>{w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
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

        <Modal isOpen={modalState.type === 'addFamily'} onClose={() => setModalState({ type: null })} maxWidth="95%"><FamilyForm onSave={handleAddFamily} onCancel={() => setModalState({ type: null })} /></Modal>
        <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={() => setModalState({ type: null })} maxWidth="800px"><PersonForm initialData={modalState.data || emptyWarga} onSave={handleSave} onCancel={() => setModalState({ type: null })} isEdit={modalState.type === 'edit'} /></Modal>
        <Modal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null })} maxWidth="400px"><ConfirmationModal onConfirm={handleDelete} onCancel={() => setModalState({ type: null })} title="Konfirmasi Hapus" message="Hapus data?" confirmText="Hapus" confirmStyle={buttonStyle.delete} /></Modal>
        <ToastNotification message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
}