"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from '@/lib/firebase';
import { FaFilePdf, FaFileExcel } from "react-icons/fa"; // IMPORT ICON BARU

// ==================================================================================
// 1. STYLE & COMPONENT KECIL
// ==================================================================================

export const inputStyle = { width: '100%', padding: '0.65rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.6)', border: '1px solid #333', color: '#fff', borderRadius: '6px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' };

export const buttonStyle = {
    save: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    cancel: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    delete: { padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #ff4d4f, #b30021)', border: '1px solid #ff4d4f', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    pagination: { padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', },
    paginationActive: { padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'default', transition: 'all 0.2s', },
    addFamily: { flex: '1 1 auto', padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', justifyContent: 'center', minWidth: '140px' },
    exportTrigger: { flex: '1 1 auto', padding: '0.5rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(145deg, #8e2de2, #4a00e0)', border: '1px solid #8e2de2', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '140px' },
    dropdownMenu: { position: 'absolute', top: '110%', right: 0, background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.7)', zIndex: 100, overflow: 'hidden', minWidth: '180px', display: 'flex', flexDirection: 'column' },
    dropdownItem: { padding: '0.8rem 1rem', fontSize: '0.85rem', background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#ccc', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'background 0.2s' }
};

export const pendidikanOptions = ["Tidak/Belum Sekolah", "Belum Tamat SD/Sederajat", "Tamat SD/Sederajat", "SLTP/SEDERAJAT", "SLTA/SEDERAJAT", "Diploma I/II", "Akademi/Diploma III/S. Muda", "Diploma IV/Strata I", "Strata II", "Strata III"];
export const golDarahOptions = ["-", "A", "B", "AB", "O"];

// ==================================================================================
// 2. FORM COMPONENTS (FAMILY & PERSON)
// ==================================================================================

const FamilyForm = ({ onSave, onCancel, isLoading }) => { 
    const [no_kk, setNoKk] = useState(""); 
    const [nama_kk, setNamaKk] = useState(""); 
    const [alamat, setAlamat] = useState("Kp. Cikadu"); 
    const [rt, setRt] = useState("02"); 
    const [rw, setRw] = useState("19"); 
    
    const defP = { nama: "", nik: "", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", gol_darah: "-", is_dead: false, is_yatim: false, is_duafa: false }; 
    
    const [kk, setKk] = useState({...defP, status:"Kepala Keluarga", status_kawin:"Kawin"}); 
    const [istri, setIstri] = useState({...defP, jenis_kelamin:"P", status:"Istri", status_kawin:"Kawin"}); 
    const [anak, setAnak] = useState([{...defP, status:"Anak"}]); 

    const handleKepalakeluargaChange = (e) => { 
        const { name, value, type, checked } = e.target; 
        setKk(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); 
        if(name === 'nama') setNamaKk(value); 
    }; 
    
    const handleIstriChange = (e) => { 
        const { name, value, type, checked } = e.target; 
        setIstri(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); 
    }; 
    
    const handleAnakChange = (index, e) => { 
        const { name, value, type, checked } = e.target; 
        const newAnak = [...anak]; 
        newAnak[index] = { ...newAnak[index], [name]: type === 'checkbox' ? checked : value }; 
        setAnak(newAnak); 
    }; 
    
    const handleAddAnak = () => { setAnak(prev => [...prev, { ...defP, status: "Anak" }]); }; 
    const handleRemoveAnak = (index) => { setAnak(prev => prev.filter((_, i) => i !== index)); }; 
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!no_kk || !kk.nama || !kk.nik) { alert('Data Kepala Keluarga wajib diisi!'); return; } 
        const fam = [{...kk, no_kk, nama_kk, alamat, rt, rw}]; 
        if(istri.nama && istri.nik) fam.push({...istri, no_kk, nama_kk, alamat, rt, rw}); 
        anak.forEach(a => { if(a.nama && a.nik) fam.push({...a, no_kk, nama_kk, alamat, rt, rw}); }); 
        onSave(fam); 
    }; 
    
    return ( 
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}> 
             <h2 style={{ color: '#00eaff', margin: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>Input Data Keluarga</h2>
             
             <div style={{ paddingBottom: '1rem', borderBottom: '2px solid rgba(0, 255, 136, 0.3)' }}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '0.5rem'}}>
                    <input name="no_kk" value={no_kk} onChange={(e) => setNoKk(e.target.value)} placeholder="Nomor KK*" required style={inputStyle} />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem'}}>
                    <input name="rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="RT" style={inputStyle} />
                    <input name="rw" value={rw} onChange={(e) => setRw(e.target.value)} placeholder="RW" style={inputStyle} />
                    <input name="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" style={inputStyle} />
                </div>
            </div>

             <div style={{ borderLeft: '3px solid #00ff88', paddingLeft: '1rem' }}>
                <h3 style={{ color: '#00ff88', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Kepala Keluarga *</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}>
                    <input name="nama" value={kk.nama} onChange={handleKepalakeluargaChange} placeholder="Nama Lengkap*" required style={inputStyle} />
                    <input name="nik" value={kk.nik} onChange={handleKepalakeluargaChange} placeholder="NIK*" required style={inputStyle} />
                    <select name="jenis_kelamin" value={kk.jenis_kelamin} onChange={handleKepalakeluargaChange} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select>
                    <input name="tempat_lahir" value={kk.tempat_lahir} onChange={handleKepalakeluargaChange} placeholder="Tempat Lahir" style={inputStyle} />
                    <input name="tgl_lahir" type="date" value={kk.tgl_lahir} onChange={handleKepalakeluargaChange} style={{...inputStyle, colorScheme: 'dark'}} />
                    <input name="agama" value={kk.agama} onChange={handleKepalakeluargaChange} placeholder="Agama" style={inputStyle} />
                    <select name="gol_darah" value={kk.gol_darah} onChange={handleKepalakeluargaChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
                    <select name="pendidikan" value={kk.pendidikan} onChange={handleKepalakeluargaChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    <input name="pekerjaan" value={kk.pekerjaan} onChange={handleKepalakeluargaChange} placeholder="Pekerjaan" style={inputStyle} />
                </div>
             </div>
             
             <div style={{ borderLeft: '3px solid #ff80ed', paddingLeft: '1rem' }}>
                <h3 style={{ color: '#ff80ed', margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Istri (Opsional)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}>
                    <input name="nama" value={istri.nama} onChange={handleIstriChange} placeholder="Nama Lengkap" style={inputStyle} />
                    <input name="nik" value={istri.nik} onChange={handleIstriChange} placeholder="NIK" style={inputStyle} />
                    <input name="tempat_lahir" value={istri.tempat_lahir} onChange={handleIstriChange} placeholder="Tempat Lahir" style={inputStyle} />
                    <input name="tgl_lahir" type="date" value={istri.tgl_lahir} onChange={handleIstriChange} style={{...inputStyle, colorScheme: 'dark'}} />
                    <input name="agama" value={istri.agama} onChange={handleIstriChange} placeholder="Agama" style={inputStyle} />
                    <select name="gol_darah" value={istri.gol_darah} onChange={handleIstriChange} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
                    <select name="pendidikan" value={istri.pendidikan} onChange={handleIstriChange} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    <input name="pekerjaan" value={istri.pekerjaan} onChange={handleIstriChange} placeholder="Pekerjaan" style={inputStyle} />
                </div>
             </div>

             <div style={{ borderLeft: '3px solid #ffaa00', paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <h3 style={{ color: '#ffaa00', margin: 0, fontSize: '0.95rem' }}>Anak (Opsional)</h3>
                    <button type="button" onClick={handleAddAnak} style={{ ...buttonStyle.save, padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}> + Tambah Anak </button>
                </div>
                {anak.map((anakItem, index) => (
                    <div key={index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 170, 0, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#ffaa00', fontWeight: '500', fontSize: '0.8rem' }}>Anak {index + 1}</span>
                            <button type="button" onClick={() => handleRemoveAnak(index)} style={{ ...buttonStyle.delete, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}> Hapus </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}>
                            <input name="nama" value={anakItem.nama} onChange={(e) => handleAnakChange(index, e)} placeholder="Nama" style={inputStyle} />
                            <input name="nik" value={anakItem.nik} onChange={(e) => handleAnakChange(index, e)} placeholder="NIK" style={inputStyle} />
                            <select name="jenis_kelamin" value={anakItem.jenis_kelamin} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> <option value="L">Laki-laki</option> <option value="P">Perempuan</option> </select>
                            <input name="tempat_lahir" value={anakItem.tempat_lahir} onChange={(e) => handleAnakChange(index, e)} placeholder="Tempat Lahir" style={inputStyle} />
                            <input name="tgl_lahir" type="date" value={anakItem.tgl_lahir} onChange={(e) => handleAnakChange(index, e)} style={{...inputStyle, colorScheme: 'dark'}} />
                            <select name="gol_darah" value={anakItem.gol_darah} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}> {golDarahOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
                            <select name="pendidikan" value={anakItem.pendidikan} onChange={(e) => handleAnakChange(index, e)} style={inputStyle}>{pendidikanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                            <input name="pekerjaan" value={anakItem.pekerjaan} onChange={(e) => handleAnakChange(index, e)} placeholder="Pekerjaan" style={inputStyle} />
                        </div>
                    </div>
                ))}
             </div>
             
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap-reverse' }}> 
                <button type="button" disabled={isLoading} onClick={onCancel} style={{...buttonStyle.cancel, opacity: isLoading?0.5:1}}>Batal</button> 
                <button type="submit" disabled={isLoading} style={{...buttonStyle.save, opacity: isLoading?0.5:1}}>{isLoading ? 'Menyimpan...' : 'Simpan Keluarga'}</button> 
             </div> 
        </form> 
    ); 
};

const PersonForm = ({ initialData, onSave, onCancel, isEdit = false, onAddChild, isLoading }) => { 
    const defaultForm = { nama: "", nik: "", no_kk: "", nama_kk: "", rt: "02", rw: "19", alamat: "Kp. Cikadu", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", gol_darah: "-", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", status: "Warga", is_yatim: false, is_duafa: false, is_dead: false }; 
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
                <div style={{display:'flex',gap:'0.5rem'}}> 
                    <input name="rt" value={formData.rt||""} onChange={handleChange} placeholder="RT" style={inputStyle} /> 
                    <input name="rw" value={formData.rw||""} onChange={handleChange} placeholder="RW" style={inputStyle} /> 
                </div> 
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
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem', flexWrap:'wrap', gap:'1rem'}}> 
                <div>
                    {isEdit && (
                        <button type="button" disabled={isLoading} onClick={() => onAddChild(formData)} style={{...buttonStyle.addFamily, fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'linear-gradient(145deg, #ffaa00, #cc8800)', border: '1px solid #ffaa00', opacity: isLoading ? 0.5 : 1}}>
                            + Tambah Anak
                        </button>
                    )}
                </div>
                <div style={{display:'flex', gap:'1rem'}}>
                    <button type="button" disabled={isLoading} onClick={onCancel} style={{...buttonStyle.cancel, opacity: isLoading?0.5:1}}>Batal</button> 
                    <button type="submit" disabled={isLoading} style={{...buttonStyle.save, opacity: isLoading?0.5:1}}>{isLoading ? 'Menyimpan...' : 'Simpan'}</button> 
                </div>
            </div> 
        </form> 
    ); 
};

// ==================================================================================
// 3. MAIN PAGE LOGIC
// ==================================================================================

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_ixGsBHyGtBzQpsgq4dpD6fVfRl-HmnNLzWYFwZhlqh2ff1HHMadKtqwi-GkgKvPFYg/exec"; 

// --- HELPER ---
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
const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle, isLoading }) => ( <div> <h3 style={{color:confirmStyle.color,textAlign:'center',marginTop:0}}>{title}</h3> <p style={{textAlign:'center',color:'#aaa',margin:'1.5rem 0'}}>{message}</p> <div style={{display:'flex',justifyContent:'center',gap:'1rem'}}> <button onClick={onCancel} disabled={isLoading} style={{...buttonStyle.cancel, opacity: isLoading?0.5:1}}>Batal</button> <button onClick={onConfirm} disabled={isLoading} style={{...confirmStyle, opacity: isLoading?0.5:1}}>{isLoading ? 'Memproses...' : confirmText}</button> </div> </div> );
const ToastNotification = ({ message, type, isVisible, onClose }) => { const [m,sM]=useState(false); useEffect(()=>sM(true),[]); if(!m)return null; const col=type==='success'?'#00ff88':'#ff4d4f'; return ReactDOM.createPortal( <div style={{position:'fixed',top:'20px',left:'50%',transform:isVisible?'translate(-50%,0)':'translate(-50%,-200%)',background:`${col}1A`,border:`1px solid ${col}80`,color:'#fff',padding:'0.75rem 1.5rem',borderRadius:'50px',zIndex:9999,opacity:isVisible?1:0,transition:'all 0.5s',backdropFilter:'blur(12px)'}}> {message} </div>, document.body ); };

export default function WargaPage() {
  const [warga, setWarga] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [ageFilter, setAgeFilter] = useState(null); 
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' }); 
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const showToast = useCallback((message, type = 'success') => { setToast({ isVisible: true, message, type }); }, []); 
  useEffect(() => { if (toast.isVisible) { const timer = setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000); return () => clearTimeout(timer); } }, [toast.isVisible]);

  const [currentPage, setCurrentPage] = useState(1);
  const dataPerPage = 10;
  
  const emptyWarga = { id: null, nama: "", nik: "", no_kk: "", nama_kk: "", rt: "02", rw: "19", alamat: "Kp. Cikadu", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", gol_darah: "-", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", status: "Warga", is_yatim: false, is_duafa: false, is_dead: false };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "warga"), (snap) => {
        const list = snap.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id, 
                ...d, 
                nama: d.nama || "(Tanpa Nama)", 
                nik: String(d.nik || "-"), 
                no_kk: String(d.no_kk || "-"), 
                alamat: d.alamat || "Kp. Cikadu", 
                rt: String(d.rt || "02"), 
                rw: String(d.rw || "19"), 
                jenis_kelamin: d.jenis_kelamin || "L", 
                gol_darah: d.gol_darah || "-", 
                tgl_lahir: d.tgl_lahir || "", 
                tempat_lahir: d.tempat_lahir || "", 
                pekerjaan: d.pekerjaan || "-", 
                status: d.status || "Warga", 
                agama: d.agama || "Islam", 
                pendidikan: d.pendidikan || "-"
            };
        });
        const rolePriority = { "Kepala Keluarga": 1, "Istri": 2, "Anak": 3 };
        list.sort((a, b) => { const kkA = String(a.no_kk || ''); const kkB = String(b.no_kk || ''); if (kkA < kkB) return -1; if (kkA > kkB) return 1; return (rolePriority[a.status] || 99) - (rolePriority[b.status] || 99); });
        setWarga(list); setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub(); 
  }, []); 

  const syncToSheet = async (data) => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_URL")) return; 
      try {
          const spreadsheetData = { ...data, jenis_kelamin: data.jenis_kelamin === 'Laki- Laki' ? 'Laki-laki' : (data.jenis_kelamin === 'Perempuan' ? 'Perempuan' : data.jenis_kelamin), action: data.action || 'save' };
          await fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spreadsheetData) });
      } catch (e) { console.error("Gagal backup ke Sheet", e); }
  };

  const handleSave = async (data) => {
    if (!data.nik) return showToast("NIK Wajib diisi", "error");
    const cleanNIK = String(data.nik).trim(); 
    let originalID = modalState.data?.id;
    if (!originalID && modalState.data?.nik) { originalID = String(modalState.data.nik).trim(); }
    const isEdit = modalState.type === 'edit';

    if ((!isEdit) || (isEdit && originalID && originalID !== cleanNIK)) {
        try {
            const docRef = doc(db, "warga", cleanNIK);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const existingName = docSnap.data().nama;
                showToast(`GAGAL: NIK ${cleanNIK} sudah dipakai oleh "${existingName}"`, "error");
                return; 
            }
        } catch (e) { console.error(e); return showToast("Gagal verifikasi NIK", "error"); }
    }

    setIsSaving(true);

    try {
        await setDoc(doc(db, "warga", cleanNIK), { ...data, nik: cleanNIK });
        syncToSheet(data); 

        if (isEdit && originalID && originalID !== cleanNIK) {
             await deleteDoc(doc(db, "warga", originalID));
             syncToSheet({ id: originalID, action: 'delete' });
        }

        showToast(isEdit ? "Data berhasil diperbarui" : "Data berhasil disimpan", 'success');
        setModalState({ type: null, data: null });
    } catch(e) { 
        console.error("Error Saving:", e);
        showToast("Terjadi kesalahan saat menyimpan data", 'error'); 
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
      let idToDelete = modalState.data?.id;
      if (!idToDelete && modalState.data?.nik) { idToDelete = String(modalState.data.nik).trim(); }
      
      if(!idToDelete) {
          showToast("Gagal: ID/NIK tidak ditemukan.", "error");
          setModalState({ type: null, data: null });
          return;
      }

      setIsSaving(true);

      try { 
          await deleteDoc(doc(db, "warga", idToDelete)); 
          const dataToDelete = { ...modalState.data, action: 'delete', id: idToDelete }; 
          syncToSheet(dataToDelete); 
          showToast("Data berhasil dihapus", 'success'); 
      } catch(e) { 
          console.error("Error Delete:", e);
          showToast("Gagal menghapus data", 'error'); 
      } finally {
        setIsSaving(false);
      }
      setModalState({ type: null, data: null });
  };

  const handleAddChildFromEdit = (parentData) => {
    const childData = { ...emptyWarga, no_kk: parentData.no_kk || "", alamat: parentData.alamat || "Kp. Cikadu", rt: parentData.rt || "02", rw: parentData.rw || "19", status: "Anak", nama: "", nik: "" };
    setModalState({ type: 'add', data: childData });
  };

  const handleAddFamily = async (dataFamily) => {
    try {
        const checkPromises = dataFamily.map(async (person) => {
            const cleanNIK = String(person.nik).trim();
            if (!cleanNIK) throw new Error(`Ada anggota keluarga (${person.nama}) tanpa NIK!`);
            const docRef = doc(db, "warga", cleanNIK);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) { throw new Error(`GAGAL: NIK ${cleanNIK} milik ${person.nama} sudah terdaftar!`); }
            return person; 
        });
        await Promise.all(checkPromises);
    } catch (validationError) { showToast(validationError.message, 'error'); return; }

    setIsSaving(true);

    try {
        const batchPromises = dataFamily.map(person => { 
            const cleanNIK = String(person.nik).trim();
            const finalData = { ...person, nik: cleanNIK };
            syncToSheet(finalData); 
            return setDoc(doc(db, "warga", cleanNIK), finalData); 
        });
        await Promise.all(batchPromises);
        showToast("Seluruh Keluarga berhasil ditambahkan", 'success');
        setModalState({ type: null, data: null });
    } catch(e) { console.error(e); showToast("Gagal menyimpan data keluarga", 'error'); } 
    finally { setIsSaving(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const jsonData = JSON.parse(event.target.result);
            if (!Array.isArray(jsonData)) throw new Error("Format JSON harus berupa Array [...]");
            
            showToast(`Mulai mengimpor ${jsonData.length} data... Jangan tutup halaman!`, "warning");
            setIsSaving(true);

            let successCount = 0;
            let failCount = 0;

            for (const item of jsonData) {
                const rawNik = item.nik || item.no_nik || item.NIK || item.NoNIK;
                const rawNama = item.nama || item.nama_lengkap || item.Nama || item.NamaLengkap;

                if (!rawNik || !rawNama) { continue; }

                const cleanNIK = String(rawNik).trim();
                let rawTgl = item.tgl_lahir || item.Tgl_Lahir || item['Tgl Lahir'] || item.tanggal_lahir || "";
                let cleanTgl = "";
                if(rawTgl) {
                    cleanTgl = String(rawTgl).replace(/\//g, "-"); 
                }

                let rawGolDarah = item.gol_darah || item.Gol_Darah || item['Gol Darah'] || item.goldar || "-";
                if (String(rawGolDarah).length > 3 || /\d/.test(String(rawGolDarah))) {
                    rawGolDarah = "-";
                }

                const finalData = {
                    ...emptyWarga, 
                    nama: rawNama,
                    nik: cleanNIK,
                    no_kk: String(item.no_kk || item.NoKK || item['No KK'] || ""),
                    alamat: item.alamat || "Kp. Cikadu",
                    rt: String(item.rt || item.RT || "02"),
                    rw: String(item.rw || item.RW || "19"),
                    jenis_kelamin: (String(item.jenis_kelamin).toLowerCase().includes('l')) ? 'L' : 'P',
                    tempat_lahir: item.tempat_lahir || item.Tempat_Lahir || "",
                    tgl_lahir: cleanTgl, 
                    agama: item.agama || "Islam",
                    gol_darah: rawGolDarah, 
                    pendidikan: item.pendidikan || item.pendidikan_terakhir || item.Pendidikan || "-",
                    pekerjaan: item.pekerjaan || item.Pekerjaan || "-", 
                    status: item.status || item.hub_keluarga || item.Hubungan || "Warga", 
                    is_dead: false,
                    is_yatim: false,
                    is_duafa: false
                };

                try {
                    await setDoc(doc(db, "warga", cleanNIK), finalData);
                    successCount++;
                } catch (err) {
                    console.error("Gagal import NIK " + cleanNIK, err);
                    failCount++;
                }
            }

            showToast(`Selesai! Berhasil: ${successCount}, Skip/Gagal: ${failCount}`, "success");

        } catch (error) {
            console.error("Error parsing JSON:", error);
            showToast("File JSON tidak valid!", "error");
        } finally {
            setIsSaving(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
    };
    reader.readAsText(file);
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
  const renderFilterLabel = () => { if (!ageFilter) return `Semua Warga (${statistics.hidup})`; if (['Kepala Keluarga', 'Istri', 'Anak'].includes(ageFilter)) return `${ageFilter}`; if (['Balita', 'Anak', 'Remaja', 'Dewasa', 'Pra-Lansia', 'Lansia'].includes(ageFilter)) return `${ageFilter} (${statistics.usia[ageFilter]})`; if (ageFilter === 'Yatim') return `Yatim (${statistics.yatim})`; if (ageFilter === 'Duafa') return `Duafa (${statistics.duafa})`; if (ageFilter === 'Meninggal') return `Meninggal (${statistics.meninggal})`; return ageFilter; };

  const handleExportPDF = async () => {
    const exportData = filteredWarga.filter(w => { if (ageFilter === 'Meninggal') return true; return !w.is_dead; });
    if (!exportData.length) { showToast("Data kosong.", "error"); return; }
    showToast("Menyiapkan PDF... Harap tunggu", "warning"); 
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const logo = new Image(); logo.src = '/logo-rt.png'; 
    logo.onload = () => {
        const doc = new jsPDF('l', 'mm', 'a3');
        const pageWidth = doc.internal.pageSize.width; const pageHeight = doc.internal.pageSize.height;
        const tableColumn = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Agama", "Gol", "Tempat Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan" ];
        const tableRows = exportData.map((w, index) => [ index + 1, w.no_kk, w.nik, w.nama, w.status, w.alamat, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.agama, w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan ]);
        const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga (Aktif)';
        const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
        
        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 50, theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, valign: 'middle', overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [68, 113, 196], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 9, lineColor: [68, 113, 196] },
            alternateRowStyles: { fillColor: [242, 242, 242] },
            columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 32, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 83 }, 4: { cellWidth: 22 }, 5: { cellWidth: 18 }, 6: { cellWidth: 8, halign: 'center' }, 7: { cellWidth: 9, halign: 'center' }, 8: { cellWidth: 21 }, 9: { cellWidth: 18 }, 10: { cellWidth: 12, halign: 'center' }, 11: { cellWidth: 22, halign: 'center' }, 12: { cellWidth: 20, halign: 'center' }, 13: { cellWidth: 12, halign: 'center' }, 14: { cellWidth: 34 }, 15: { cellWidth: 30 } },
            didParseCell: (data) => { if (data.section === 'body') { const row = exportData[data.row.index]; if (row && row.is_dead) { data.cell.styles.textColor = [255, 77, 79]; data.cell.styles.fontStyle = 'bold'; } } },
            didDrawPage: (data) => {
                doc.addImage(logo, 'PNG', 20, 10, 25, 25);
                doc.setFont("times", "bold"); doc.setFontSize(20); doc.text("KETUA RT. 02 RW. 19", pageWidth / 2, 16, { align: 'center' });
                doc.setFontSize(20); doc.text("DESA DAYEUH", pageWidth / 2, 24, { align: 'center' });
                doc.setFontSize(20); doc.text("KECAMATAN CILEUNGSI KABUPATEN BOGOR", pageWidth / 2, 32, { align: 'center' });
                doc.setFont("times", "normal"); doc.setFontSize(11); doc.text("Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281", pageWidth / 2, 39, { align: 'center' });
                doc.setLineWidth(1); doc.line(20, 44, pageWidth - 20, 44); 
                doc.setFontSize(10); doc.setTextColor(100); doc.text(`Waktu Export: ${exportTime}`, pageWidth - 20, 49, { align: 'right' }); doc.text(filterText, 20, 49, { align: 'left' });
                doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(data.settings.margin.left, pageHeight - 10, pageWidth - data.settings.margin.right, pageHeight - 10);
                doc.setFontSize(9); doc.setTextColor(100); doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - data.settings.margin.right, pageHeight - 5, { align: 'right' }); doc.text("Sistem Administrasi RT Kp. Cikadu", data.settings.margin.left, pageHeight - 5);
            },
            // PERBAIKAN: margin top diubah jadi 50 supaya sama dengan startY halaman 1
            margin: { top: 50, bottom: 15, left: 20, right: 20 }
        });
        showToast("Mengunduh PDF...", "success"); 
        doc.save(`Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.pdf`);
        setTimeout(() => { showToast("PDF sudah terdownload", "success"); }, 1500); 
    };
    logo.onerror = () => { showToast("Gagal memuat file logo.", "error"); };
  };

  const handleExportExcel = async () => {
    const exportData = filteredWarga.filter(w => { if (ageFilter === 'Meninggal') return true; return !w.is_dead; });
    if (!exportData.length) { showToast("Data kosong.", "error"); return; }
    showToast("Menyiapkan Excel... Harap tunggu", "warning");
    const ExcelJS = (await import("exceljs")).default;
    const exportTime = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const filterText = ageFilter ? `Kategori: ${ageFilter}` : 'Kategori: Semua Warga (Aktif)';
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Warga');
    const kopRows = [ ["KETUA RT. 02 RW. 19"], ["DESA DAYEUH"], ["KECAMATAN CILEUNGSI KABUPATEN BOGOR"], ["Sekretariat : Jl. Akses Desa Dayeuh Kp. Cikadu Ds. Dayeuh No Telp. 081293069281"] ];
    kopRows.forEach((row, index) => { const currentRow = worksheet.getRow(index + 1); currentRow.values = [row[0]]; worksheet.mergeCells(`A${index + 1}:R${index + 1}`); currentRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; if (index === 0) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 1) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else if (index === 2) currentRow.getCell(1).font = { bold: true, size: 16, name: 'Times New Roman' }; else currentRow.getCell(1).font = { size: 10, name: 'Times New Roman' }; });
    worksheet.getRow(5).values = [""]; worksheet.mergeCells('A5:R5'); worksheet.getCell('A5').border = { bottom: { style: 'medium' } };
    worksheet.getRow(6).values = [filterText, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Export: ${exportTime}`]; worksheet.mergeCells('A6:E6'); worksheet.mergeCells('R6:R6'); worksheet.getCell('A6').font = { bold: true }; worksheet.getCell('R6').alignment = { horizontal: 'right' }; worksheet.getCell('R6').font = { bold: true };
    const headerRow = worksheet.getRow(8); 
    headerRow.values = [ "No", "No KK", "NIK", "Nama Lengkap", "Hub Keluarga", "Alamat", "RT", "RW", "Jenis Kelamin", "Agama", "Gol", "Tempat Lahir", "Tgl Lahir", "Usia", "Pendidikan", "Pekerjaan", "Kategori" ];
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4471C4' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
    exportData.forEach((w, index) => { 
        const rowValues = [ index + 1, w.no_kk, w.nik, w.nama, w.status, w.alamat, w.rt, w.rw, w.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', w.agama, w.gol_darah, w.tempat_lahir, formatTableDate(w.tgl_lahir), getAge(w.tgl_lahir), w.pendidikan, w.pekerjaan, getKategoriText(w) ]; 
        const row = worksheet.addRow(rowValues); 
        if (w.is_dead) { row.eachCell((cell) => { cell.font = { color: { argb: 'FFFF0000' } }; }); }
        row.eachCell((cell, colNumber) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; if ([1, 7, 8, 9, 11, 13, 14].includes(colNumber)) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; } else { cell.alignment = { vertical: 'middle', horizontal: 'left' }; } }); 
    });
    worksheet.columns = [ { width: 5 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 6 }, { width: 6 }, { width: 15 }, { width: 15 }, { width: 5 }, { width: 15 }, { width: 15 }, { width: 6 }, { width: 25 }, { width: 20 }, { width: 20 } ];
    showToast("Mengunduh Excel...", "success");
    const buffer = await workbook.xlsx.writeBuffer(); 
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
    const url = window.URL.createObjectURL(blob); 
    const a = document.createElement('a'); a.href = url; a.download = `Data_Warga_Cikadu_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); window.URL.revokeObjectURL(url);
    setTimeout(() => { showToast("Excel sudah terdownload", "success"); }, 1500);
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
                    
                    {/* TOMBOL IMPORT JSON BARU */}
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} disabled={isSaving} style={{ ...buttonStyle.addFamily, background: 'linear-gradient(145deg, #ff8c00, #e65100)', border: '1px solid #ff8c00' }}>
                        {isSaving ? '⏳ Loading...' : '📂 Import JSON'}
                    </button>

                    <button onClick={() => setModalState({ type: 'addFamily', data: emptyWarga })} style={buttonStyle.addFamily}>+ Keluarga</button>
                    
                    {/* --- TOMBOL EXPORT DENGAN ICON (UPDATE DISINI) --- */}
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={buttonStyle.exportTrigger}>📤 Export ▼</button>
                        {showExportMenu && ( 
                            <div style={buttonStyle.dropdownMenu} onMouseLeave={() => setShowExportMenu(false)}> 
                                <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#fff'}}>
                                    <FaFilePdf style={{ color: '#ef4444', fontSize: '1rem' }} /> Download PDF
                                </button> 
                                <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} style={{...buttonStyle.dropdownItem, color: '#fff'}}>
                                    <FaFileExcel style={{ color: '#10b981', fontSize: '1rem' }} /> Download Excel
                                </button> 
                            </div> 
                        )}
                    </div>

                </div>
             </div>
             
             {/* DROPDOWN FILTER CUSTOM */}
             <div style={{ padding: '1rem', background: 'rgba(0, 170, 255, 0.03)', border: '1px solid rgba(0, 170, 255, 0.1)', borderRadius: '10px', position:'relative' }}>
               <label style={{ color: '#00eaff', marginBottom: '0.5rem', display: 'block', fontWeight: '600', fontSize: '0.85rem' }}>Filter Statistik</label>
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
        <Modal isOpen={modalState.type === 'addFamily'} onClose={() => setModalState({ type: null })} maxWidth="95%">
            <FamilyForm 
                onSave={handleAddFamily} 
                onCancel={() => setModalState({ type: null })} 
                isLoading={isSaving} 
            />
        </Modal>
        
        <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={() => setModalState({ type: null })} maxWidth="800px">
            <PersonForm 
                initialData={modalState.data || emptyWarga} 
                onSave={handleSave} 
                onCancel={() => setModalState({ type: null })} 
                isEdit={modalState.type === 'edit'} 
                onAddChild={handleAddChildFromEdit}
                isLoading={isSaving} 
            />
        </Modal>
        
        <Modal isOpen={modalState.type === 'delete'} onClose={() => setModalState({ type: null })} maxWidth="400px">
            <ConfirmationModal 
                onConfirm={handleDelete} 
                onCancel={() => setModalState({ type: null })} 
                title="Konfirmasi Hapus" 
                message="Hapus data?" 
                confirmText="Hapus" 
                confirmStyle={buttonStyle.delete} 
                isLoading={isSaving} 
            />
        </Modal>
        
        <ToastNotification message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
}