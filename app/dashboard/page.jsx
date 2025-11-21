"use client";
import { useState, useEffect, useMemo } from "react";
import { database, ref, onValue, get } from "@/lib/firebase";
import Link from "next/link";

// --- HELPER LOGIC (TIDAK BERUBAH) ---
const getAge = (dateString) => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};

const getCategory = (age) => {
    if (age === null || age < 0) return "N/A";
    if (age <= 5) return "Balita";
    if (age <= 12) return "Anak";
    if (age <= 20) return "Remaja";
    if (age <= 60) return "Dewasa";
    return "Lansia";
};

export default function DashboardHome() {
  const [warga, setWarga] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    const unsub = onValue(ref(database, 'warga'), (s) => {
        const d = s.val();
        setWarga(d ? (Array.isArray(d) ? d.filter(Boolean) : Object.values(d)) : []);
    });
    return () => { clearInterval(timer); unsub(); }
  }, []);

  // --- LOGIC BACKUP (TIDAK BERUBAH) ---
  const handleBackup = async () => {
      if (!confirm("Download cadangan data lengkap (Warga + Keuangan)?")) return;
      setIsBackingUp(true);
      try {
          const snapshot = await get(ref(database));
          if (snapshot.exists()) {
              const fullData = snapshot.val();
              const jsonString = JSON.stringify(fullData, null, 2);
              const blob = new Blob([jsonString], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `FULL_BACKUP_RT06_${new Date().toISOString().slice(0,10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              alert("✅ Backup berhasil didownload!");
          } else { alert("Database kosong."); }
      } catch (error) { console.error(error); alert("❌ Gagal backup."); }
      setIsBackingUp(false);
  };

  const stats = useMemo(() => {
      const active = warga.filter(w => !w.is_dead);
      const total = active.length;
      const kk = new Set(active.map(w => String(w.No_KK || w.no_kk).trim()).filter(Boolean)).size;
      const l = active.filter(w => (w.L_P || w.jenis_kelamin) === 'L').length;
      const p = active.filter(w => (w.L_P || w.jenis_kelamin) === 'P').length;
      
      const cat = { "Balita":0, "Anak":0, "Remaja":0, "Dewasa":0, "Lansia":0 };
      active.forEach(w => { 
          const age = getAge(w.Tgl_Lahir || w.tgl_lahir);
          const c = getCategory(age); 
          if(cat[c] !== undefined) cat[c]++; 
      });

      const latest = [...active].reverse().slice(0, 5);
      return { total, kk, l, p, cat, latest };
  }, [warga]);

  if (!mounted) return <div style={{padding:'2rem', fontSize:'0.8rem', color:'#666'}}>Memuat...</div>;

  // --- STYLE (SAMA PERSIS DENGAN DATA WARGA & KEUANGAN) ---
  const styles = {
      // Tombol Backup mirip tombol Export
      backupBtn: { 
          fontSize: '0.75rem', background: 'linear-gradient(145deg, #8e2de2, #4a00e0)', color: '#fff', 
          border: '1px solid #8e2de2', padding: '0.4rem 0.8rem', borderRadius: '6px', 
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight:'600',
          transition: 'all 0.2s', whiteSpace: 'nowrap'
      },
      
      // Container Kartu
      card: (borderColor) => ({
          background: '#111', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '1rem',
          position: 'relative', overflow: 'hidden', display:'flex', flexDirection:'column', justifyContent:'space-between'
      }),
      
      cardLabel: (color) => ({
          color: color, fontSize: '0.7rem', letterSpacing: '1px', fontWeight:'bold', textTransform:'uppercase', opacity: 0.9
      }),
      
      cardValue: {
          fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginTop: '0.3rem', lineHeight:'1'
      },

      // List Style (Mirip Tabel)
      listContainer: {
          background: "rgba(10,10,10,0.4)", borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow:'hidden'
      },
      listHeader: {
          padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      },
      listTitle: { fontSize: '0.85rem', fontWeight: '600', color: '#00aaff', margin: 0 },
      listItem: {
          padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* 1. HEADER (SAMA SEPERTI DATA WARGA/KEUANGAN) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#fff' }}>Dashboard Utama</h1>
                <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.8rem' }}>Ringkasan Data RT.06 Kp. Cikadu</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button 
                    onClick={handleBackup} 
                    disabled={isBackingUp}
                    style={styles.backupBtn}
                >
                    {isBackingUp ? '⏳...' : '💾 Backup Data'}
                </button>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
            </div>
        </div>

        {/* 2. STATS GRID (KOMPAK & RAPI) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            
            {/* Total Warga (Cyan) */}
            <div style={styles.card('#00eaff')}>
                <div style={styles.cardLabel('#00eaff')}>Total Warga</div>
                <div style={styles.cardValue}>{stats.total}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>Jiwa</div>
            </div>

            {/* Kartu Keluarga (Hijau) */}
            <div style={styles.card('#00ff88')}>
                <div style={styles.cardLabel('#00ff88')}>Kepala Keluarga</div>
                <div style={styles.cardValue}>{stats.kk}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>KK Terdaftar</div>
            </div>

            {/* Laki-laki (Biru) */}
            <div style={styles.card('#00aaff')}>
                <div style={styles.cardLabel('#00aaff')}>Laki-laki</div>
                <div style={styles.cardValue}>{stats.l}</div>
                {/* Mini Bar */}
                <div style={{ width: '100%', height: '4px', background: '#222', marginTop: '0.5rem', borderRadius: '2px' }}>
                    <div style={{ width: `${(stats.l/stats.total)*100}%`, height: '100%', background: '#00aaff', borderRadius: '2px' }}></div>
                </div>
            </div>

            {/* Perempuan (Pink) */}
            <div style={styles.card('#ff4d4f')}>
                <div style={styles.cardLabel('#ff4d4f')}>Perempuan</div>
                <div style={styles.cardValue}>{stats.p}</div>
                {/* Mini Bar */}
                <div style={{ width: '100%', height: '4px', background: '#222', marginTop: '0.5rem', borderRadius: '2px' }}>
                    <div style={{ width: `${(stats.p/stats.total)*100}%`, height: '100%', background: '#ff4d4f', borderRadius: '2px' }}></div>
                </div>
            </div>
        </div>

        {/* 3. CONTENT SECTION (SPLIT VIEW) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* KIRI: INPUT TERBARU (STYLE TABEL DATA WARGA) */}
            <div style={styles.listContainer}>
                <div style={styles.listHeader}>
                    <h3 style={styles.listTitle}>Input Warga Terbaru</h3>
                </div>
                <div>
                    {stats.latest.length > 0 ? stats.latest.map((w, i) => (
                        <div key={i} style={styles.listItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ width:'30px', height:'30px', background:'#222', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', border:'1px solid #333', color:'#888' }}>
                                    {w.Nama_Lengkap ? w.Nama_Lengkap.charAt(0) : '?'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '500' }}>{w.Nama_Lengkap || w.nama}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#666' }}>NIK: {w.NIK || w.nik}</div>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#888', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px', border:'1px solid #333' }}>
                                {w.RT ? `RT ${w.RT}` : '-'}
                            </span>
                        </div>
                    )) : <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>Belum ada data.</div>}
                </div>
            </div>

            {/* KANAN: KOMPOSISI USIA (STYLE PROGRESS BAR) */}
            <div style={styles.listContainer}>
                <div style={styles.listHeader}>
                    <h3 style={{ ...styles.listTitle, color: '#fff' }}>Statistik Usia</h3>
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                    {Object.entries(stats.cat).map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#aaa', width: '60px' }}>{label}</span>
                            
                            <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px', margin: '0 1rem' }}>
                                <div style={{ width: `${stats.total ? (val/stats.total)*100 : 0}%`, height: '100%', background: '#00aaff', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                            </div>
                            
                            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600', width: '20px', textAlign: 'right' }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    </div>
  );
}