import { useState } from "react";
import { inputStyle, buttonStyle, pendidikanOptions, golDarahOptions } from "./styles";

const FamilyForm = ({ onSave, onCancel }) => { 
    const [no_kk, setNoKk] = useState(""); 
    const [nama_kk, setNamaKk] = useState(""); 
    const [alamat, setAlamat] = useState("Kp. Cikadu"); 
    const [rt, setRt] = useState("06"); 
    const [rw, setRw] = useState("19"); 
    
    const defP = { nama: "", nik: "", jenis_kelamin: "L", tempat_lahir: "", tgl_lahir: "", agama: "Islam", pendidikan: "SLTA/SEDERAJAT", pekerjaan: "", status_kawin: "Belum Kawin", gol_darah: "-", is_dead: false, is_yatim: false, is_duafa: false }; 
    
    const [kk, setKk] = useState({...defP, status:"Kepala Keluarga", status_kawin:"Kawin"}); 
    const [istri, setIstri] = useState({...defP, jenis_kelamin:"P", status:"Istri", status_kawin:"Kawin"}); 
    const [anak, setAnak] = useState([{...defP, status:"Anak"}]); 

    const handleKepalakeluargaChange = (e) => { 
        const { name, value, type, checked } = e.target; 
        setKk(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); 
        // Logic ini TETAP ADA agar nama_kk tersimpan otomatis saat user mengetik Nama di bagian bawah
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
    
    const handleAddAnak = () => { 
        setAnak(prev => [...prev, { ...defP, status: "Anak" }]); 
    }; 
    
    const handleRemoveAnak = (index) => { 
        setAnak(prev => prev.filter((_, i) => i !== index)); 
    }; 
    
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
             
             {/* BAGIAN DATA KK & ALAMAT (SUDAH DIPERBAIKI) */}
             <div style={{ paddingBottom: '1rem', borderBottom: '2px solid rgba(0, 255, 136, 0.3)' }}>
                {/* Input Nama Kepala Keluarga di sini SUDAH DIHAPUS */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '0.5rem'}}>
                    <input name="no_kk" value={no_kk} onChange={(e) => setNoKk(e.target.value)} placeholder="Nomor KK*" required style={inputStyle} />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem'}}>
                    <input name="rt" value={rt} onChange={(e) => setRt(e.target.value)} placeholder="RT" style={inputStyle} />
                    <input name="rw" value={rw} onChange={(e) => setRw(e.target.value)} placeholder="RW" style={inputStyle} />
                    <input name="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" style={inputStyle} />
                </div>
            </div>

             {/* BAGIAN KEPALA KELUARGA (User isi nama di sini) */}
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
             
             {/* BAGIAN ISTRI */}
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

             {/* BAGIAN ANAK */}
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
             
             {/* Tombol Simpan */}
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap-reverse' }}> 
                <button type="button" onClick={onCancel} style={buttonStyle.cancel}>Batal</button> 
                <button type="submit" style={buttonStyle.save}>Simpan Keluarga</button> 
             </div> 
        </form> 
    ); 
};
export default FamilyForm;