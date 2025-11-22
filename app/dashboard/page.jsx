"use client";

// --- 1. NUCLEAR CONSOLE PATCH (Peredam Error Wajib Paling Atas) ---
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
// ------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot } from "@/lib/firebase";
import { 
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

// --- IMPORT IKON MODERN (LUCIDE REACT) ---
import { 
  LuLayoutDashboard, LuUsers, LuUserCheck, LuHouse, LuWallet, 
  LuUserX, LuShieldCheck, LuPartyPopper, LuX, LuZap 
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

// Warna Modern
const COLORS_GENDER = ['#0ea5e9', '#f43f5e']; 
const COLORS_AGE = ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#ef4444'];

// Style text gradient
const gradientTextStyle = {
    background: "linear-gradient(to right, #00eaff, #0077ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "inline-block"
};

// --- STYLE WRAPPER (Tinggi Chart 160px) ---
const chartWrapperStyle = { 
    width: '100%', 
    height: '160px', 
    position: 'relative' 
};

export default function DashboardHome() {
  const [warga, setWarga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  
  // State Notification
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // --- LOGIC POPUP PINTAR (SESSION STORAGE) ---
    // Cek apakah user sudah pernah melihat notif di sesi ini?
    const hasSeenWelcome = sessionStorage.getItem('welcome_seen');

    if (!hasSeenWelcome) {
        // Jika belum lihat, tampilkan notif (dengan delay sedikit biar smooth)
        setTimeout(() => {
            setShowWelcome(true);
            // Simpan tanda bahwa user sudah melihat
            sessionStorage.setItem('welcome_seen', 'true');
        }, 500);
    }
    // ------------------------------------------------------------

    const timer = setInterval(() => setTime(new Date()), 1000);
    const unsubWarga = onSnapshot(collection(db, 'warga'), (snap) => {
        setWarga(snap.docs.map(doc => doc.data()));
        setLoading(false);
    });

    return () => { 
        clearInterval(timer); 
        unsubWarga(); 
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
      const l = active.filter(w => {
          const jk = (w.jenis_kelamin || "").toString().toUpperCase();
          return jk === 'L' || jk === 'LAKI-LAKI';
      }).length;
      const p = active.filter(w => {
          const jk = (w.jenis_kelamin || "").toString().toUpperCase();
          return jk === 'P' || jk === 'PEREMPUAN' || jk === 'WANITA';
      }).length;
      const genderData = [ { name: 'Laki-Laki', value: l }, { name: 'Perempuan', value: p } ];
      const catCounts = { "Balita": 0, "Anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0, "Meninggal": 0 };
      warga.forEach(w => {
          if (w.is_dead) { catCounts["Meninggal"]++; } 
          else {
              const age = getAge(w.tgl_lahir);
              const c = getAgeCategory(age);
              if(catCounts[c] !== undefined) catCounts[c]++;
          }
      });
      const ageData = Object.keys(catCounts).map(key => ({ name: key, jumlah: catCounts[key] }));
      const latest = [...warga].sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; 
      }).slice(0, 5);
      
      // Mock Data
      const financeData = [
        { bulan: 'Mei', masuk: 1500000, keluar: 500000 },
        { bulan: 'Jun', masuk: 1200000, keluar: 800000 },
        { bulan: 'Jul', masuk: 2000000, keluar: 1500000 },
        { bulan: 'Ags', masuk: 1800000, keluar: 400000 },
        { bulan: 'Sep', masuk: 900000, keluar: 200000 },
        { bulan: 'Okt', masuk: 2500000, keluar: 1000000 },
      ];
      const totalSaldo = 12500000; 
      const petugasRonda = 4;

      return { total, totalKK, l, p, genderData, ageData, latest, financeData, totalSaldo, petugasRonda };
  }, [warga]);

  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#00eaff', fontSize:'0.8rem'}}>Memuat...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '100%', overflowX: 'hidden', position: 'relative' }}>
        
        {/* --- CSS ANIMATION UNTUK POPUP --- */}
        <style jsx global>{`
            @keyframes popIn {
                0% { opacity: 0; transform: scale(0.8) translateY(20px); }
                60% { opacity: 1; transform: scale(1.05) translateY(0); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes glow {
                0% { box-shadow: 0 0 10px rgba(0, 234, 255, 0.2); }
                50% { box-shadow: 0 0 25px rgba(0, 234, 255, 0.5); }
                100% { box-shadow: 0 0 10px rgba(0, 234, 255, 0.2); }
            }
        `}</style>

        {/* --- POPUP NOTIFIKASI MODERN --- */}
        {showWelcome && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '1.5rem'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px', 
                    padding: '2rem', 
                    maxWidth: '360px', 
                    width: '100%',
                    textAlign: 'center',
                    position: 'relative', 
                    animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Tombol Close Circle */}
                    <button 
                        onClick={() => setShowWelcome(false)}
                        style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888',
                            width: '30px', height: '30px', borderRadius: '50%',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            cursor: 'pointer', fontSize: '1rem', transition: '0.2s'
                        }}
                    >
                        <LuX />
                    </button>

                    {/* Ikon dengan Glow Effect */}
                    <div style={{
                        position: 'relative', margin: '0 auto 1.2rem', width: 'fit-content'
                    }}>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '60px', height: '60px', background: '#00eaff', borderRadius: '50%',
                            filter: 'blur(30px)', opacity: 0.4, zIndex: 0
                        }}></div>
                        <div style={{
                            width: '64px', height: '64px', 
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            border: '1px solid rgba(0, 234, 255, 0.3)',
                            borderRadius: '20px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '2rem', color: '#00eaff', zIndex: 1,
                            position: 'relative', animation: 'glow 3s infinite'
                        }}>
                            <LuPartyPopper />
                        </div>
                    </div>

                    {/* Teks Sambutan */}
                    <h2 style={{ 
                        color: '#fff', fontSize: '1.3rem', fontWeight: '700', 
                        marginBottom: '0.4rem', letterSpacing: '-0.5px' 
                    }}>
                        Selamat Datang!
                    </h2>
                    <p style={{ 
                        color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', 
                        marginBottom: '1.5rem' 
                    }}>
                        Dashboard <b>RT. 06</b> siap digunakan. Pantau warga, kas, & keamanan dalam satu layar.
                    </p>

                    {/* Tombol Compact Modern */}
                    <button 
                        onClick={() => setShowWelcome(false)}
                        style={{
                            background: 'linear-gradient(to right, #00eaff, #0077ff)',
                            border: 'none', borderRadius: '50px', 
                            padding: '0.7rem 2rem', 
                            color: '#fff', fontWeight: '600', cursor: 'pointer',
                            fontSize: '0.85rem', letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(0, 119, 255, 0.4)',
                            transition: 'transform 0.1s active'
                        }}
                    >
                        Mulai Kelola
                    </button>
                </div>
            </div>
        )}
        
        {/* --- HEADER --- */}
        <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', 
            gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' 
        }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', ...gradientTextStyle }}>
                    Kp. Cikadu RT. 06
                </h1>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#888' }}>Ketua RT. 06 - Dedi Suryadi</p>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px', ...gradientTextStyle }}>
                    {time.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '500' }}>
                    {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
            </div>
        </div>

        {/* --- KARTU STATISTIK --- */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.6rem' 
        }}>
            <CardStat icon={<LuUsers />} label="Total Warga" value={stats.total} sub="Jiwa (Hidup)" color="#00eaff" bg="rgba(0, 234, 255, 0.1)"/>
            <CardStat icon={<LuHouse />} label="Kepala Keluarga" value={stats.totalKK} sub="Kartu Keluarga" color="#00ff88" bg="rgba(0, 255, 136, 0.1)"/>
            <CardStat 
                icon={<LuWallet />} 
                label="Saldo Kas RT" 
                value={`Rp ${stats.totalSaldo.toLocaleString('id-ID')}`} 
                sub="Update Terkini" 
                color="#f59e0b" 
                bg="rgba(245, 158, 11, 0.1)"
                isCurrency={true}
            />
            <CardStat 
                icon={<LuShieldCheck />} 
                label="Petugas Ronda" 
                value={`${stats.petugasRonda} Org`} 
                sub="Jadwal Malam Ini" 
                color="#f43f5e" 
                bg="rgba(244, 63, 94, 0.1)"
            />
        </div>

        {/* --- AREA GRAFIK --- */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '0.8rem' 
        }}>
            {/* CHART 1: KEUANGAN */}
            <div style={containerStyle}>
                <h3 style={headerStyle}>
                    <LuWallet style={{color: '#f59e0b'}}/> Arus Kas (6 Bulan)
                </h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <AreaChart data={stats.financeData} margin={{top:5, right:5, left:-15, bottom:0}}>
                                <defs>
                                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="bulan" stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '4px', fontSize:'0.65rem' }} itemStyle={{ fontSize:'0.65rem' }}/>
                                <Area type="monotone" dataKey="masuk" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" name="Masuk" strokeWidth={2} />
                                <Area type="monotone" dataKey="keluar" stroke="#ef4444" fillOpacity={1} fill="url(#colorKeluar)" name="Keluar" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 2: DEMOGRAFI */}
            <div style={containerStyle}>
                <h3 style={headerStyle}>
                    <LuUsers style={{color: '#8b5cf6'}}/> Usia & Status
                </h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <BarChart data={stats.ageData} margin={{top:5, right:5, left:-25, bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', fontSize:'0.65rem' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="jumlah" radius={[3, 3, 0, 0]} barSize={20}>
                                    {stats.ageData.map((entry, index) => ( 
                                        <Cell key={`cell-${index}`} fill={COLORS_AGE[index % COLORS_AGE.length]} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 3: GENDER */}
            <div style={containerStyle}>
                <h3 style={headerStyle}>
                    <LuUserCheck style={{color: '#0ea5e9'}}/> Gender
                </h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={stats.genderData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                                    {stats.genderData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} /> ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', fontSize:'0.65rem' }} itemStyle={{ color: '#fff' }} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize:'0.65rem'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>

        {/* --- DAFTAR WARGA TERBARU --- */}
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h3 style={{ margin: 0, color: '#e0e0e0', fontSize: '0.8rem' }}>Data Terbaru (Input/Update)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {stats.latest.length > 0 ? stats.latest.map((w, i) => (
                    <div key={i} style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.8rem', 
                        padding: '0.5rem', background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' 
                    }}>
                        <div style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                            background: w.is_dead ? '#ef4444' : (w.jenis_kelamin === 'L' || w.jenis_kelamin === 'Laki-laki' || w.jenis_kelamin === 'LAKI-LAKI' ? 'linear-gradient(135deg, #3b82f6, #0ea5e9)' : 'linear-gradient(135deg, #ec4899, #f43f5e)'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.65rem'
                        }}>
                            {w.is_dead ? <LuUserX style={{fontSize: '0.8rem'}} /> : (w.nama ? w.nama.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: w.is_dead ? '#ef4444' : '#fff', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {w.nama} {w.is_dead && '(Alm)'}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#777' }}>
                                {w.status} • {w.is_dead ? 'Meninggal' : `${getAge(w.tgl_lahir)} Thn`}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#00eaff', whiteSpace: 'nowrap' }}>
                            {w.rt}/{w.rw}
                        </div>
                    </div>
                )) : <div style={{color:'#666', padding:'0.5rem', textAlign:'center', fontSize:'0.7rem'}}>Kosong.</div>}
            </div>
        </div>

    </div>
  );
}

// --- KOMPONEN KARTU ---
const CardStat = ({ icon, label, value, sub, color, bg, isCurrency }) => (
    <div style={{ 
        background: '#161616', border: `1px solid ${color}30`, borderRadius: '10px', padding: '0.8rem',
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
        <div style={{ 
            position: 'absolute', top: '-8px', right: '-8px', 
            width: '40px', height: '40px', background: bg, 
            borderRadius: '50%', filter: 'blur(15px)', zIndex: 0 
        }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 1, marginBottom:'0.1rem' }}>
            <div style={{ fontSize: '1rem', color: color }}>{icon}</div>
            <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
        <div style={{ fontSize: isCurrency ? '1.1rem' : '1.4rem', fontWeight: '700', color: '#fff', lineHeight: 1, zIndex: 1, marginTop:'2px' }}>
            {value}
        </div>
        <div style={{ fontSize: '0.6rem', color: color, opacity: 0.9, zIndex: 1 }}>
            {sub}
        </div>
    </div>
);

// --- STYLE HELPER ---
const containerStyle = {
    background: '#161616', 
    border: '1px solid rgba(255,255,255,0.05)', 
    borderRadius: '10px', 
    padding: '0.8rem', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0 
};

const headerStyle = { 
    margin: '0 0 0.5rem', 
    color: '#fff', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.4rem', 
    fontSize: '0.75rem',
    fontWeight: '600'
};