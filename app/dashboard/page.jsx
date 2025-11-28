"use client";

// --- 1. NUCLEAR CONSOLE PATCH (Tetap dipertahankan) ---
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
import { db, collection, onSnapshot, query, orderBy } from "@/lib/firebase"; 
import { 
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
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

// --- WARNA CHART ---
const COLOR_LAKI = '#00ccff'; 
const COLOR_PEREMPUAN = '#ff0066'; 
const COLORS_AGE = ['#8b5cf6', '#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardHome() {
  const [warga, setWarga] = useState([]);
  const [transaksi, setTransaksi] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); 
    window.addEventListener('resize', checkMobile); 
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Fetch Warga & Keuangan
    const unsubWarga = onSnapshot(collection(db, 'warga'), (snap) => setWarga(snap.docs.map(doc => doc.data())));
    const qKeuangan = query(collection(db, 'keuangan'), orderBy('tanggal', 'asc'));
    const unsubKeuangan = onSnapshot(qKeuangan, (snap) => {
        setTransaksi(snap.docs.map(doc => doc.data()));
        setLoading(false); 
    });

    return () => { clearInterval(timer); unsubWarga(); unsubKeuangan(); window.removeEventListener('resize', checkMobile); }
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
      
      const l = active.filter(w => (w.jenis_kelamin || "").toString().toUpperCase().startsWith('L')).length;
      const p = active.filter(w => (w.jenis_kelamin || "").toString().toUpperCase().startsWith('P') || (w.jenis_kelamin || "").toString().toUpperCase().startsWith('W')).length;
      const genderData = [ { name: 'Laki-Laki', value: l }, { name: 'Perempuan', value: p } ];
      
      const catCounts = { "Balita": 0, "Anak": 0, "Remaja": 0, "Dewasa": 0, "Lansia": 0, "Meninggal": 0 };
      warga.forEach(w => {
          if (w.is_dead) { catCounts["Meninggal"]++; } 
          else { const age = getAge(w.tgl_lahir); const c = getAgeCategory(age); if(catCounts[c] !== undefined) catCounts[c]++; }
      });
      const ageData = Object.keys(catCounts).map(key => ({ name: key, jumlah: catCounts[key] }));
      
      const latest = [...warga].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 5);
      
      let totalMasuk = 0, totalKeluar = 0;
      const monthlyStats = {};
      transaksi.forEach(t => {
          const date = new Date(t.tanggal);
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleString('id-ID', { month: 'short' });
          const val = Number(t.nominal) || 0;
          if (t.tipe === 'masuk') totalMasuk += val; else totalKeluar += val;
          if (!monthlyStats[sortKey]) monthlyStats[sortKey] = { name: monthLabel, masuk: 0, keluar: 0 };
          if (t.tipe === 'masuk') monthlyStats[sortKey].masuk += val; else monthlyStats[sortKey].keluar += val;
      });
      const financeData = Object.keys(monthlyStats).sort().map(k => monthlyStats[k]).slice(-6);
      if (financeData.length === 0) financeData.push({ name: 'N/A', masuk: 0, keluar: 0 });
      const totalSaldo = totalMasuk - totalKeluar;
      const wargaProduktif = active.filter(w => { const age = getAge(w.tgl_lahir); return age !== null && age >= 15 && age <= 55; }).length;

      return { total, totalKK, l, p, genderData, ageData, latest, financeData, totalSaldo, wargaProduktif };
  }, [warga, transaksi]);

  if (loading) return null;

  const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        
        <style jsx global>{`
            .stat-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
                gap: 1.5rem; 
            }
            @media (max-width: 768px) { 
                .stat-grid { 
                    grid-template-columns: 1fr 1fr !important; 
                    gap: 0.8rem; 
                }
                .card-inner {
                    padding: 0.8rem !important;
                    overflow: hidden; /* MENCEGAH SCROLLBAR MUNCUL DI KARTU */
                }
            }

            .neon-card {
                position: relative;
                background: #111; 
                border-radius: 16px;
                z-index: 1;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .neon-card::before {
                content: "";
                position: absolute;
                inset: -1px; 
                border-radius: 16px;
                z-index: -1;
                background: linear-gradient(135deg, var(--c1), transparent 50%, transparent 80%, var(--c2));
                filter: blur(15px); 
                opacity: 0.5; 
            }

            .card-inner {
                background: linear-gradient(to bottom, #161616, #111);
                border-radius: 16px;
                padding: 1.2rem;
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                z-index: 2; 
                overflow: hidden; /* PENTING: Mencegah scrollbar internal */
            }
        `}</style>

        {/* --- HEADER --- */}
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

        {/* --- GRID STATS --- */}
        <div className="stat-grid">
            <div className="neon-card" style={{'--c1': '#00eaff', '--c2': '#0055ff'}}>
                <CardInner icon={<LuUsers />} label="Total Warga" value={stats.total} sub="JIWA" color="#00eaff" />
            </div>
            
            <div className="neon-card" style={{'--c1': '#00ff88', '--c2': '#00aa55'}}>
                <CardInner icon={<LuHouse />} label="Kepala Keluarga" value={stats.totalKK} sub="KK" color="#00ff88" />
            </div>

            <div className="neon-card" style={{'--c1': '#f59e0b', '--c2': '#aa4400'}}>
                <CardInner icon={<LuWallet />} label="Saldo Kas RT" value={formatRp(stats.totalSaldo)} sub="UPDATE" color="#f59e0b" isCurrency={true} />
            </div>

            <div className="neon-card" style={{'--c1': '#8b5cf6', '--c2': '#aa00ff'}}>
                <CardInner icon={<LuZap />} label="Usia Produktif" value={stats.wargaProduktif} sub="15-55 THN" color="#8b5cf6" />
            </div>
        </div>

        {/* --- GRID CHARTS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* CHART KEUANGAN */}
            <div className="neon-card" style={{'--c1': '#f59e0b', '--c2': '#d97706'}}>
                <div className="card-inner">
                    <h3 style={{ margin: '0 0 1.2rem', color: '#eee', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '700', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        <LuWallet style={{color: '#f59e0b'}}/> Grafik Kas (6 Bulan)
                    </h3>
                    {/* PERBAIKAN: overflow: 'hidden' ditambahkan di sini */}
                    <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
                        {isClient && (
                            <ResponsiveContainer width="99%" height="100%">
                                <AreaChart data={stats.financeData} margin={{top:10, right:10, left:-20, bottom:0}}>
                                    <defs>
                                        <linearGradient id="colorMasukUnique" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00ff88" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorKeluarUnique" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff0055" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#ff0055" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(0)}jt` : (val/1000).toFixed(0)+'rb'} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} itemStyle={{ fontSize:'0.8rem', fontWeight:'600' }} formatter={(value) => formatRp(value)} />
                                    <Area type="monotone" dataKey="masuk" stroke="#00ff88" strokeWidth={3} fill="url(#colorMasukUnique)" name="Pemasukan" activeDot={{r: 6, strokeWidth: 0, fill:'#fff'}} />
                                    <Area type="monotone" dataKey="keluar" stroke="#ff0055" strokeWidth={3} fill="url(#colorKeluarUnique)" name="Pengeluaran" activeDot={{r: 6, strokeWidth: 0, fill:'#fff'}} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* CHART USIA */}
            <div className="neon-card" style={{'--c1': '#8b5cf6', '--c2': '#7c3aed'}}>
                <div className="card-inner">
                    <h3 style={{ margin: '0 0 1.2rem', color: '#eee', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '700', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        <LuUsers style={{color: '#8b5cf6'}}/> Demografi Usia
                    </h3>
                    {/* PERBAIKAN: overflow: 'hidden' ditambahkan di sini */}
                    <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
                        {isClient && (
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={stats.ageData} margin={{top:10, right:10, left:-20, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                                    <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} itemStyle={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }} labelStyle={{ color: '#00eaff', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight:'600' }} />
                                    <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                                        {stats.ageData.map((entry, index) => (
                                            <Cell key={`cell-age-${index}`} fill={COLORS_AGE[index % COLORS_AGE.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* CHART GENDER */}
            <div className="neon-card" style={{'--c1': '#0ea5e9', '--c2': '#00ccff'}}>
                <div className="card-inner">
                    <h3 style={{ margin: '0 0 1.2rem', color: '#eee', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '700', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        <LuUsers style={{color: '#0ea5e9'}}/> Komposisi Gender
                    </h3>
                    {/* PERBAIKAN: overflow: 'hidden' ditambahkan di sini */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position:'relative', overflow: 'hidden' }}>
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                                        <Cell fill={COLOR_LAKI} />
                                        <Cell fill={COLOR_PEREMPUAN} />
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color:'#fff' }} itemStyle={{ color:'#fff', fontWeight:'bold' }} />
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
        </div>

        {/* --- DAFTAR WARGA TERBARU --- */}
        <div className="neon-card" style={{'--c1': '#444', '--c2': '#666'}}>
            <div className="card-inner">
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
    </div>
  );
}

const CardInner = ({ icon, label, value, sub, color, isCurrency }) => (
    <div className="card-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ color: color, fontSize:'0.9rem', background: `rgba(255,255,255,0.05)`, padding:'5px', borderRadius:'6px', display:'flex', boxShadow: `0 0 10px ${color}20` }}>{icon}</div>
        </div>
        
        <div style={{ 
            fontSize: isCurrency ? 'clamp(1rem, 5vw, 1.8rem)' : 'clamp(1.4rem, 5vw, 2rem)', 
            fontWeight: '700', color: '#fff', lineHeight: 1.2, marginTop:'0.5rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
            {value}
        </div>
        <div style={{ fontSize: '0.65rem', color: color, opacity: 0.9, display:'flex', alignItems:'center', gap:'4px', fontWeight:'500', marginTop:'auto', paddingTop:'0.5rem' }}>
            <div style={{width:5, height:5, borderRadius:'50%', background:color, boxShadow: `0 0 5px ${color}`}}></div> {sub}
        </div>
    </div>
);