"use client";

// --- PATCH CONSOLE ---
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && /defaultProps/.test(args[0])) return;
  if (typeof args[0] === "string" && /width\(-1\)/.test(args[0])) return;
  originalError.call(console, ...args);
};

import { AreaChart, Area, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { FaWallet, FaLock, FaClock } from "react-icons/fa";

export default function KeuanganPage() {
  
  const dummyData = [
    { name: 'Jan', saldo: 2000000 },
    { name: 'Feb', saldo: 3500000 },
    { name: 'Mar', saldo: 2800000 },
    { name: 'Apr', saldo: 4500000 },
    { name: 'Mei', saldo: 5200000 },
    { name: 'Jun', saldo: 6800000 },
    { name: 'Jul', saldo: 8500000 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '80vh' }}>
      
      {/* --- HEADER --- */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
         <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <FaWallet style={{ color: '#00ff88' }} /> Keuangan RT
         </h1>
         <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#888' }}>Transparansi Anggaran, Iuran & Laporan Kas</p>
      </div>

      {/* --- KONTEN UTAMA (MAINTENANCE MODE) --- */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        background: "rgba(10,10,10,0.4)", // Style konsisten dengan Warga/Dashboard
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '3rem 1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Decorative Glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents:'none' }}></div>

        {/* Icon Animation */}
        <style jsx>{`
            @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        `}</style>
        <div style={{ fontSize: '3.5rem', color: '#00ff88', marginBottom: '1.5rem', animation: 'float 3s ease-in-out infinite', dropShadow: '0 0 10px rgba(0,255,136,0.5)' }}>
            <FaLock />
        </div>

        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>
            Fitur Segera Hadir
        </h2>
        
        <p style={{ maxWidth: '500px', color: '#aaa', lineHeight: '1.6', marginBottom: '3rem', fontSize:'0.95rem' }}>
            Modul Keuangan sedang dalam tahap pengembangan akhir. <br/>
            Nantinya Anda dapat memantau pemasukan iuran warga, pengeluaran operasional, dan saldo kas RT secara <b>Realtime</b>.
        </p>

        {/* Dummy Chart Preview */}
        <div style={{ width: '100%', maxWidth: '700px', height: '220px', position: 'relative', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ position: 'absolute', top: '10px', left: '15px', display:'flex', alignItems:'center', gap:'0.5rem', color: '#00ff88', fontSize: '0.75rem', fontWeight:'600', textTransform:'uppercase' }}>
                <FaClock /> Preview System
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummyData}>
                    <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize:'0.8rem' }}
                        itemStyle={{ color: '#00ff88' }}
                        formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                    />
                    <Area type="monotone" dataKey="saldo" stroke="#00ff88" strokeWidth={2} fillOpacity={1} fill="url(#colorSaldo)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>

      </div>

      {/* --- FOOTER --- */}
      <footer style={{ 
          textAlign: 'center', padding: '1.5rem', 
          borderTop: '1px solid rgba(255,255,255,0.05)', color: '#666', fontSize: '0.8rem'
      }}>
          &copy; {new Date().getFullYear()} Sistem Administrasi RT Kp. Cikadu. <span style={{ color: '#00eaff', marginLeft:'5px' }}>Developed by Niki Azis</span>
      </footer>

    </div>
  );
}