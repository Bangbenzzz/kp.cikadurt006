import { useState, useEffect } from "react";
import { inputStyle, buttonStyle, pendidikanOptions, golDarahOptions } from "./styles";

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
export default PersonForm;