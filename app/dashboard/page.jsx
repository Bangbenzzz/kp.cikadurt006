"use client";

// --- 1. NUCLEAR CONSOLE PATCH (Peredam Error Wajib Paling Atas) ---
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    // Saring error Recharts yang mengganggu
    if (/defaultProps/.test(args[0])) return;
    if (/width\(-1\)/.test(args[0])) return;
    if (/width\(0\)/.test(args[0])) return;
    if (/height\(0\)/.test(args[0])) return;
    
    // Biarkan error lain (seperti syntax error) tetap muncul
    originalError.call(console, ...args);
  };
}
// ------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { db, collection, onSnapshot } from "@/lib/firebase";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { FaUsers, FaUserTie, FaFemale, FaMale, FaChild, FaHome } from "react-icons/fa";

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

const COLORS_GENDER = ['#00C49F', '#FF8042']; 
// Urutan: Balita, Anak, Remaja, Dewasa, Lansia, MENINGGAL
const COLORS_AGE = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#ff4d4f'];

// Style text gradient
const gradientTextStyle = {
    background: "linear-gradient(to right, #00eaff, #0077ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "inline-block"
};

// Style wrapper chart (Fixed height agar tidak error width -1)
const chartWrapperStyle = { 
    width: '100%', 
    height: '200px', 
    position: 'relative' 
};

export default function DashboardHome() {
  const [warga, setWarga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Tandai browser sudah siap render
    setIsClient(true);

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
      // 1. Hitung Total (Hanya yang hidup)
      const active = warga.filter(w => !w.is_dead);
      const total = active.length;
      const kkSet = new Set(active.map(w => String(w.no_kk || "").trim()).filter(k => k.length > 5));
      const totalKK = kkSet.size;

      // 2. Hitung Gender
      const l = active.filter(w => w.jenis_kelamin === 'L' || w.jenis_kelamin === 'Laki-laki').length;
      const p = active.filter(w => w.jenis_kelamin === 'P' || w.jenis_kelamin === 'Perempuan').length;
      const genderData = [ { name: 'Laki', value: l }, { name: 'Perempuan', value: p } ];

      // 3. Hitung Kategori Usia + Meninggal
      const catCounts = { "Balita": 0, "Anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0, "Meninggal": 0 };

      warga.forEach(w => {
          if (w.is_dead) {
              catCounts["Meninggal"]++;
          } else {
              const age = getAge(w.tgl_lahir);
              const c = getAgeCategory(age);
              if(catCounts[c] !== undefined) catCounts[c]++;
          }
      });

      const ageData = Object.keys(catCounts).map(key => ({ name: key, jumlah: catCounts[key] }));
      const latest = [...warga].slice(-5).reverse();

      return { total, totalKK, l, p, genderData, ageData, latest };
  }, [warga]);

  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#00eaff', fontSize:'0.8rem'}}>Memuat...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        
        {/* --- HEADER (FIXED SYNTAX ERROR) --- */}
        <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', 
            gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' 
        }}>
            <div>
                {/* Pastikan tag h1 ditutup dengan h1 */}
                <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', ...gradientTextStyle }}>
                    Kp. Cikadu RT. 06
                </h1>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#888' }}>Ketua RT. 06 - Dedi Suryadi</p>
            </div>
            
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '0.75rem', color: '#ccc', fontWeight: '500' }}>
                    {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px', ...gradientTextStyle }}>
                    {time.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                </div>
            </div>
        </div>

        {/* --- KARTU STATISTIK --- */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.6rem' 
        }}>
            <CardStat icon={<FaUsers />} label="Total" value={stats.total} sub="Jiwa (Hidup)" color="#00eaff" bg="rgba(0, 234, 255, 0.1)"/>
            <CardStat icon={<FaHome />} label="KK" value={stats.totalKK} sub="Kartu" color="#00ff88" bg="rgba(0, 255, 136, 0.1)"/>
            <CardStat icon={<FaMale />} label="Laki-Laki" value={stats.l} sub="Orang" color="#448aff" bg="rgba(68, 138, 255, 0.1)"/>
            <CardStat icon={<FaFemale />} label="Perempuan" value={stats.p} sub="Orang" color="#ff4d4f" bg="rgba(255, 77, 79, 0.1)"/>
        </div>

        {/* --- AREA GRAFIK --- */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '0.8rem' 
        }}>
            
            {/* CHART 1: USIA & STATUS */}
            <div style={containerStyle}>
                <h3 style={headerStyle}>
                    <FaChild style={{color: '#8884d8'}}/> Demografi & Status
                </h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <BarChart data={stats.ageData} margin={{top:5, right:5, left:-25, bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={9} tickLine={false} axisLine={false} interval={0} />
                                <YAxis stroke="#666" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '4px', fontSize:'0.65rem', padding:'4px' }} 
                                    itemStyle={{ color: '#fff' }} 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                />
                                <Bar dataKey="jumlah" radius={[3, 3, 0, 0]} barSize={25}>
                                    {stats.ageData.map((entry, index) => ( 
                                        <Cell key={`cell-${index}`} fill={COLORS_AGE[index % COLORS_AGE.length]} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 2: GENDER */}
            <div style={containerStyle}>
                <h3 style={headerStyle}>
                    <FaUserTie style={{color: '#00C49F'}}/> Gender (Hidup)
                </h3>
                <div style={chartWrapperStyle}>
                    {isClient && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={stats.genderData}
                                    cx="50%" cy="50%"
                                    innerRadius={40} 
                                    outerRadius={60} 
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.genderData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS_GENDER[index % COLORS_GENDER.length]} /> ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '4px', fontSize:'0.65rem', padding:'4px' }} itemStyle={{ color: '#fff' }} />
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
                <h3 style={{ margin: 0, color: '#e0e0e0', fontSize: '0.8rem' }}>Data Terbaru (Input)</h3>
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
                            background: w.is_dead ? '#ff4d4f' : (w.jenis_kelamin === 'L' || w.jenis_kelamin === 'Laki-laki' ? 'linear-gradient(135deg, #0052cc, #007aff)' : 'linear-gradient(135deg, #d4145a, #fbb03b)'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.65rem'
                        }}>
                            {w.is_dead ? '†' : (w.nama ? w.nama.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: w.is_dead ? '#ff4d4f' : '#fff', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
const CardStat = ({ icon, label, value, sub, color, bg }) => (
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
            <div style={{ fontSize: '0.8rem', color: color }}>{icon}</div>
            <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', lineHeight: 1, zIndex: 1 }}>
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