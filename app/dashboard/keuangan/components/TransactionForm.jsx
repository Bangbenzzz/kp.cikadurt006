"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { FaPlus, FaSave, FaTimes, FaPen } from "react-icons/fa";
import { LuLoader } from "react-icons/lu"; 

export default function TransactionForm({ onSuccess, editingData, onCancelEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State Form
  const [tipe, setTipe] = useState("masuk");
  const [nominal, setNominal] = useState(""); 
  const [displayNominal, setDisplayNominal] = useState(""); 
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // Efek ketika tombol Edit ditekan di List
  useEffect(() => {
    if (editingData) {
        setShowForm(true);
        setTipe(editingData.tipe);
        setNominal(editingData.nominal);
        setDisplayNominal(Number(editingData.nominal).toLocaleString("id-ID"));
        setKeterangan(editingData.keterangan);
        setTanggal(editingData.tanggal);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas
    }
  }, [editingData]);

  const handleNominalChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setNominal(rawValue);
    if (rawValue === "") setDisplayNominal("");
    else setDisplayNominal(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleCancel = () => {
      setShowForm(false);
      resetForm();
      if(onCancelEdit) onCancelEdit();
  };

  const resetForm = () => {
      setNominal(""); setDisplayNominal(""); setKeterangan("");
      setTanggal(new Date().toISOString().split('T')[0]);
      setTipe("masuk");
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!nominal || !keterangan) return alert("Mohon isi nominal dan keterangan!");

    setSubmitting(true);
    try {
      const payload = { tipe, nominal: Number(nominal), keterangan, tanggal };
      
      if (editingData) {
          // Mode UPDATE
          await updateDoc(doc(db, "keuangan", editingData.id), { ...payload, updatedAt: serverTimestamp() });
          if(onSuccess) onSuccess("Data berhasil diperbarui!");
      } else {
          // Mode CREATE
          await addDoc(collection(db, "keuangan"), { ...payload, createdAt: serverTimestamp() });
          if(onSuccess) onSuccess("Transaksi berhasil disimpan!");
      }
      
      handleCancel();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
        <style jsx>{`
            .input-glow:focus { outline: none; border-color: #00eaff !important; }
            .btn-hover:hover { filter: brightness(1.1); transform: translateY(-1px); }
            @keyframes expandForm { from { opacity: 0; transform: scaleY(0.9); height: 0; } to { opacity: 1; transform: scaleY(1); height: auto; } }
        `}</style>

        {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-hover" style={{
                width: '100%', padding: '1.2rem', background: 'rgba(15,15,15,0.6)',
                border: '2px dashed rgba(0, 234, 255, 0.3)', borderRadius: '16px', color: '#00eaff',
                fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer'
            }}>
                <div style={{ background: 'rgba(0, 234, 255, 0.1)', padding:'8px', borderRadius:'50%' }}><FaPlus size={16} /></div>
                Tambah Transaksi Baru
            </button>
        ) : (
            <div style={{ background: "rgba(15,15,15,0.6)", border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', animation: 'expandForm 0.3s ease-out', transformOrigin: 'top' }}>
                <h3 style={{ margin: '0 0 1rem', color: '#eee', fontSize: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}> 
                    {editingData ? <><FaPen color='#f59e0b'/> Edit Transaksi</> : <><FaPlus color='#00eaff'/> Input Transaksi</>} 
                </h3>
                <form onSubmit={handleSimpan} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', background:'rgba(0,0,0,0.3)', padding:'4px', borderRadius:'8px' }}>
                        <button type="button" onClick={() => setTipe('masuk')} style={{ background: tipe === 'masuk' ? '#00ff88' : 'transparent', color: tipe === 'masuk' ? '#000' : '#888', border:'none', padding:'8px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Pemasukan</button>
                        <button type="button" onClick={() => setTipe('keluar')} style={{ background: tipe === 'keluar' ? '#ff0055' : 'transparent', color: tipe === 'keluar' ? '#fff' : '#888', border:'none', padding:'8px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Pengeluaran</button>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem'}}>
                        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px' }}/>
                        <input type="text" inputMode="numeric" placeholder="Nominal (Rp)" value={displayNominal} onChange={handleNominalChange} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px', fontWeight:'bold' }}/>
                    </div>
                    <textarea placeholder="Keterangan transaksi..." rows="2" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="input-glow" style={{ width:'100%', background:'#111', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px' }}/>
                    <div style={{display:'flex', gap:'0.5rem'}}>
                        <button type="submit" disabled={submitting} className="btn-hover" style={{ flex: 1, background: editingData ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #2563eb, #1e3a8a)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px' }}>
                            {submitting ? <LuLoader className="animate-spin" /> : (editingData ? <FaSave /> : <FaPlus />)} {editingData ? "Update" : "Simpan"}
                        </button>
                        <button type="button" onClick={handleCancel} className="btn-hover" style={{ background: '#333', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}><FaTimes /></button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
}