"use client";

// --- PATCH CONSOLE ---
if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
        if (/defaultProps/.test(args[0]) || /width\(-1\)/.test(args[0])) return;
        originalError.call(console, ...args);
    };
}

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FaCheckCircle, FaExclamationCircle, FaLock, FaKey } from "react-icons/fa";

// Import Komponen Halaman Keuangan
import SummarySection from "./components/SummarySection";
import ChartSection from "./components/ChartSection";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";

export default function KeuanganPage() {
  // --- STATE PENGAMANAN (LOCK) ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // --- STATE DATA KEUANGAN ---
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // --- FUNGSI UNLOCK ---
  const handleUnlock = (e) => {
      e.preventDefault();
      if (passwordInput === "kiki123") {
          setIsUnlocked(true);
          setErrorMsg("");
      } else {
          setErrorMsg("Password salah! Akses ditolak.");
          setPasswordInput("");
      }
  };

  // --- LOAD DATA (Hanya jalan jika sudah Unlocked agar hemat resource & aman) ---
  useEffect(() => {
    if (!isUnlocked) return; // Jangan load data kalau belum buka kunci

    const q = query(collection(db, "keuangan"), orderBy("tanggal", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransaksi(data);
      setLoading(false);
    });
    return () => unsub();
  }, [isUnlocked]);

  const showToast = (message, type = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // =================================================================
  // TAMPILAN LOCK SCREEN (JIKA BELUM MEMASUKKAN PASSWORD)
  // =================================================================
  if (!isUnlocked) {
      return (
        <div style={{
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(10, 10, 10, 0.6)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <div style={{
                background: 'rgba(0, 234, 255, 0.1)',
                padding: '20px',
                borderRadius: '50%',
                marginBottom: '1.5rem',
                border: '2px solid rgba(0, 234, 255, 0.3)',
                boxShadow: '0 0 20px rgba(0, 234, 255, 0.2)'
            }}>
                <FaLock size={40} color="#00eaff" />
            </div>
            
            <h2 style={{ color: '#fff', marginBottom: '0.5rem', marginTop: 0 }}>Fitur Dalam Pengembangan</h2>
            <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '400px', lineHeight: '1.5' }}>
                Halaman Keuangan sedang dalam tahap <i>maintenance</i> oleh Developer / NIKI. 
                Silakan masukkan kode akses untuk melanjutkan.
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '350px' }}>
                <div style={{ position: 'relative' }}>
                    <FaKey style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input 
                        type="password" 
                        placeholder="Masukkan Password..." 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 45px',
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff',
                            outline: 'none',
                            fontSize: '1rem'
                        }}
                    />
                </div>
                
                {errorMsg && <div style={{ color: '#ff4d4f', fontSize: '0.85rem', marginTop: '-5px' }}>{errorMsg}</div>}

                <button 
                    type="submit"
                    style={{
                        padding: '12px',
                        background: 'linear-gradient(90deg, #00eaff, #0066ff)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'transform 0.2s',
                        marginTop: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                    Buka Akses Developer
                </button>
            </form>
        </div>
      );
  }

  // =================================================================
  // TAMPILAN DASHBOARD KEUANGAN (SETELAH UNLOCK)
  // =================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* 1. Header & Stats */}
      <SummarySection transaksi={transaksi} loading={loading} />

      {/* 2. Grid Layout: Kiri (Input & Chart), Kanan (List) */}
      <div className="grid-dashboard">
          <style jsx>{`
            .grid-dashboard { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; }
            @media (max-width: 768px) { .grid-dashboard { grid-template-columns: 1fr; } }
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          `}</style>
          
          {/* KOLOM KIRI: INPUT (Atas) & GRAFIK (Bawah) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <TransactionForm 
                  onSuccess={(msg) => { showToast(msg, 'success'); setEditingItem(null); }} 
                  editingData={editingItem}
                  onCancelEdit={() => setEditingItem(null)}
              />
              <ChartSection transaksi={transaksi} />
          </div>

          {/* KOLOM KANAN: LIST RIWAYAT */}
          <TransactionList 
              transaksi={transaksi} 
              loading={loading} 
              onSuccess={(msg) => showToast(msg, 'success')} 
              onError={(msg) => showToast(msg, 'error')} 
              onEdit={(item) => setEditingItem(item)} 
          />
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, background: 'rgba(10, 10, 10, 0.95)', borderLeft: `5px solid ${toast.type === 'success' ? '#00ff88' : '#ef4444'}`, padding: '1rem', borderRadius: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'slideIn 0.3s' }}>
            {toast.type === 'success' ? <FaCheckCircle color="#00ff88"/> : <FaExclamationCircle color="#ef4444"/>}
            <div>{toast.message}</div>
        </div>
      )}
    </div>
  );
}