"use client";

// --- 1. NUCLEAR CONSOLE PATCH ---
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (/defaultProps/.test(args[0])) return;
    if (/width\(-1\)/.test(args[0])) return;
    if (/width\(0\)/.test(args[0])) return;
    if (/height\(0\)/.test(args[0])) return;
    originalError.call(console, ...args);
  };
}

import { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot } from "@/lib/firebase";
import { 
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { 
  LuUsers, LuHouse, LuWallet, LuUserX, LuZap
} from "react-icons/lu";

// --- HELPER FUNCTIONS ---
const getAge = (dateString) => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};

const getAgeCategory = (age) => {
    if (age === null || age < 0) return "N/A";
    if (age <= 5) return "Balita";
    if (age <= 11) return "Anak";
    if (age <= 25) return "Remaja";
    if (age <= 45) return "Dewasa";
    return "Lansia";
};

// --- WARNA NEON MENYALA (SOLID) ---
const COLOR_LAKI = '#00ccff'; // Cyan Terang
const COLOR_PEREMPUAN = '#ff0066'; // Pink Magenta Terang

const COLORS_AGE = [
    '#8b5cf6', // Ungu Terang
    '#d946ef', // Fuchsia
    '#06b6d4', // Cyan
    '#10b981', // Hijau Emerald
    '#f59e0b', // Amber
    '#ef4444'  // Merah
];

const chartWrapperStyle = { width: '100%', height: '200px', position: 'relative' };

export default function DashboardHome() {
  const [warga, setWarga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // DETEKSI LAYAR UNTUK CHART
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Cek saat pertama load
    window.addEventListener('resize', checkMobile); // Cek saat di-resize
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    const unsubWarga = onSnapshot(collection(db, 'warga'), (snap) => {
        setWarga(snap.docs.map(doc => doc.data()));
        setLoading(false);
    });

    return () => { 
        clearInterval(timer); 
        unsubWarga(); 
        window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const stats = useMemo(() => {
      const active = warga.filter(w => !w.is_dead);
      const total = active.length;
      
      const jumlahKepalaKeluarga = active.filter(w => {
          const allStatus = [w.status_hubungan, w.shdk, w.status_keluarga, w.status, w.posisi].join(" ").toUpperCase(); 
          return allStatus.includes("KEPALA") || allStatus.includes("KK");
      }).length;
      const uniqueKK = new Set(active.map(w => String(w.no_kk || "").trim()).filter(k => k.length > 5)).size;
      const totalKK = jumlahKepalaKeluarga > 0 ? jumlahKepalaKeluarga : uniqueKK;
      
      const l = active.filter(w => { const jk = (w.jenis_kelamin || "").toString().toUpperCase(); return jk === 'L' || jk === 'LAKI-LAKI'; }).length;
      const p = active.filter(w => { const jk = (w.jenis_kelamin || "").toString().toUpperCase(); return jk === 'P' || jk === 'PEREMPUAN' || jk === 'WANITA'; }).length;
      
      const genderData = [ { name: 'Laki-Laki', value: l }, { name: 'Perempuan', value: p } ];
      
      const catCounts = { "Balita": 0, "Anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0, "Meninggal": 0 };
      warga.forEach(w => {
          if (w.is_dead) { catCounts["Meninggal"]++; } 
          else { const age = getAge(w.tgl_lahir); const c = getAgeCategory(age); if(catCounts[c] !== undefined) catCounts[c]++; }
      });
      const ageData = Object.keys(catCounts).map(key => ({ name: key, jumlah: catCounts[key] }));

      const latest = [...warga].sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; 
      }).slice(0, 5);
      
      // DATA DENGAN BULAN LENGKAP
      const financeData = [
        { bulan: 'Mei', masuk: 1500000, keluar: 500000 },
        { bulan: 'Juni', masuk: 1200000, keluar: 800000 },
        { bulan: 'Juli', masuk: 2000000, keluar: 1500000 },
        { bulan: 'Agustus', masuk: 1800000, keluar: 400000 },
        { bulan: 'September', masuk: 900000, keluar: 200000 },
        { bulan: 'Oktober', masuk: 2500000, keluar: 1000000 },
      ];
      const totalSaldo = 12500000; 
      
      const wargaProduktif = active.filter(w => { const age = getAge(w.tgl_lahir); return age >= 15 && age <= 55; }).length;

      return { total, totalKK, l, p, genderData, ageData, latest, financeData, totalSaldo, wargaProduktif };
  }, [warga]);

  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#00eaff', fontSize:'0.8rem'}}>Memuat Dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        
        {/* CSS GRID MOBILE */}
        <style>{`
            .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
            @media (max-width: 768px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 0.6rem; } }
        `}</style>

        {/* --- HEADER --- */}
        {/* PERUBAHAN DISINI: alignItems diganti dari 'flex-end' menjadi 'center' agar sejajar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color:'#00eaff', fontFamily: 'monospace' }}>Kp. Cikadu RT. 02</h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>Ketua RT. 02 Dedi Suryadi</p>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#00eaff', fontFamily: 'monospace' }}>
                    {time.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>
                    {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>
        </div>

        {/* --- GRID STATS (ICON KEMBALI SEPERTI SEMULA) --- */}
        <div className="stat-grid">
            <CardStat icon={<LuUsers />} label="Total Warga" value={stats.total} sub="JIWA" color="#00eaff" bg="rgba(0, 234, 255, 0.1)"/>
            <CardStat icon={<LuHouse />} label="Kepala Keluarga" value={stats.totalKK} sub="KK" color="#00ff88" bg="rgba(0, 255, 136, 0.1)"/>
            <CardStat icon={<LuWallet />} label="Saldo Kas RT" value={`Rp ${stats.totalSaldo.toLocaleString('id-ID')}`} sub="UPDATE TERKINI" color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" isCurrency={true}/>
            <CardStat icon={<LuZap />} label="Usia Produktif" value={stats.wargaProduktif} sub="15-55 THN" color="#8b5cf6" bg="rgba(139, 92, 246, 0.1)"/>
        </div>

        {/* --- GRID CHARTS (WARNA VIBRANT & XAXIS FIXED) --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            
            {/* GRAPH KEUANGAN */}
            <div style={containerStyle}>
                <h3 style={headerStyle}><LuWallet style={{color: '#f59e0b'}}/> Grafik Kas</h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <AreaChart data={stats.financeData} margin={{top:10, right:10, left:-20, bottom:0}}>
                                <defs>
                                    <linearGradient id="colorMasukUnique" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0.2}/>
                                    </linearGradient>
                                    <linearGradient id="colorKeluarUnique" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff0055" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="#ff0055" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                
                                {/* 
                                   KEY INI PENTING! 
                                   Key berubah -> Chart Render Ulang -> Formatter Baru Dipakai
                                */}
                                <XAxis 
                                    key={isMobile ? 'mobile' : 'desktop'}
                                    dataKey="bulan" 
                                    stroke="#888" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(value) => isMobile ? value.slice(0, 3) : value}
                                />

                                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} 
                                    itemStyle={{ fontSize:'0.8rem', fontWeight:'600' }}
                                />

                                <Area type="monotone" dataKey="masuk" stroke="#00ff88" strokeWidth={3} fill="url(#colorMasukUnique)" name="Pemasukan" activeDot={{r: 6, strokeWidth: 0, fill:'#fff'}} />
                                <Area type="monotone" dataKey="keluar" stroke="#ff0055" strokeWidth={3} fill="url(#colorKeluarUnique)" name="Pengeluaran" activeDot={{r: 6, strokeWidth: 0, fill:'#fff'}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* GRAPH USIA */}
            <div style={containerStyle}>
                <h3 style={headerStyle}><LuUsers style={{color: '#8b5cf6'}}/> Demografi Usia</h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <BarChart data={stats.ageData} margin={{top:10, right:10, left:-20, bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} 
                                    itemStyle={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }} 
                                    labelStyle={{ color: '#00eaff', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight:'600' }}
                                />
                                
                                <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                                    {stats.ageData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-age-${index}`} 
                                            fill={COLORS_AGE[index % COLORS_AGE.length]} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

             {/* MINI CHART GENDER */}
            <div style={containerStyle}>
                 <h3 style={headerStyle}><LuUsers style={{color: '#0ea5e9'}}/> Komposisi Gender</h3>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position:'relative' }}>
                    {isClient && (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={stats.genderData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={50} outerRadius={70} 
                                    paddingAngle={3} 
                                    dataKey="value" 
                                    stroke="none"
                                >
                                    <Cell fill={COLOR_LAKI} />
                                    <Cell fill={COLOR_PEREMPUAN} />
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} 
                                    itemStyle={{ color:'#fff', fontWeight:'bold' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                     <div style={{ position:'absolute', textAlign:'center', pointerEvents:'none' }}>
                         <div style={{fontSize:'1.5rem', fontWeight:'800', color:'#fff', textShadow:'0 0 10px rgba(255,255,255,0.3)'}}>{stats.total}</div>
                         <div style={{fontSize:'0.75rem', color:'#aaa', textTransform:'uppercase', letterSpacing:'1px'}}>Total</div>
                     </div>
                 </div>
                 <div style={{ display:'flex', gap:'1rem', justifyContent:'center', marginTop:'-10px', fontSize:'0.8rem' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:10, height:10, borderRadius:'2px', background:COLOR_LAKI}}/> Laki-laki ({stats.l})</div>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:10, height:10, borderRadius:'2px', background:COLOR_PEREMPUAN}}/> Perempuan ({stats.p})</div>
                 </div>
            </div>
        </div>

        {/* --- DAFTAR WARGA TERBARU --- */}
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'0.5rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight:'600' }}>Aktivitas Data Terbaru</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.8rem' }}>
                {stats.latest.length > 0 ? stats.latest.map((w, i) => (
                    <div key={i} style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.8rem', 
                        padding: '0.8rem', background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.2s'
                    }}>
                        <div style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                            background: w.is_dead ? '#ef4444' : (w.jenis_kelamin === 'L' || w.jenis_kelamin === 'Laki-laki' ? 'linear-gradient(135deg, #00ccff, #0066ff)' : 'linear-gradient(135deg, #ff00cc, #ff3366)'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.9rem',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                        }}>
                            {w.is_dead ? <LuUserX /> : (w.nama ? w.nama.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: w.is_dead ? '#ef4444' : '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {w.nama} {w.is_dead && '(Alm)'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                {w.status} • {w.is_dead ? 'Meninggal' : `${getAge(w.tgl_lahir)} Thn`}
                            </div>
                        </div>
                    </div>
                )) : <div style={{color:'#666', padding:'1rem', textAlign:'center', fontSize:'0.8rem', gridColumn:'1/-1'}}>Belum ada data.</div>}
            </div>
        </div>
    </div>
  );
}

// --- KOMPONEN STYLING ICON KEMBALI SEPERTI SEMULA ---
const CardStat = ({ icon, label, value, sub, color, bg, isCurrency }) => (
    <div style={{ 
        background: "rgba(15,15,15,0.8)", 
        border: "1px solid rgba(255,255,255,0.05)", 
        borderRadius: '12px', 
        padding: '1.2rem',
        position: 'relative', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.4rem',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = color; }}
       onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{label}</div>
            
            {/* GAYA IKON DIKEMBALIKAN: Icon Berwarna di dalam Box Tinted */}
            <div style={{ color: color, fontSize:'1rem', background: bg, padding:'6px', borderRadius:'8px', display:'flex' }}>{icon}</div>
        </div>
        
        <div style={{ 
            fontSize: isCurrency ? 'clamp(1.1rem, 4vw, 1.8rem)' : 'clamp(1.5rem, 4vw, 2rem)', 
            fontWeight: '700', color: '#fff', lineHeight: 1.2, marginTop:'0.2rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
            {value}
        </div>
        <div style={{ fontSize: '0.7rem', color: color, opacity: 0.9, display:'flex', alignItems:'center', gap:'5px', fontWeight:'500' }}>
            <div style={{width:6, height:6, borderRadius:'50%', background:color, boxShadow: `0 0 5px ${color}`}}></div> {sub}
        </div>
    </div>
);

const containerStyle = { 
    background: "rgba(15,15,15,0.6)", 
    border: '1px solid rgba(255,255,255,0.05)', 
    borderRadius: '16px', 
    padding: '1.2rem', 
    display: 'flex', 
    flexDirection: 'column',
    minWidth: 0,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};
const headerStyle = { margin: '0 0 1.2rem', color: '#eee', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '700', textTransform:'uppercase', letterSpacing:'0.5px' };