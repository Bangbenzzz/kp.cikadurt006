"use client";

// --- PATCH CONSOLE (Peredam Error Recharts) ---
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && /defaultProps/.test(args[0])) return;
  if (typeof args[0] === "string" && /width\(-1\)/.test(args[0])) return;
  originalError.call(console, ...args);
};
// ----------------------------------------------

import { AreaChart, Area, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { FaWallet, FaLock } from "react-icons/fa";

export default function KeuanganPage() {
  
  // Data dummy untuk ilustrasi grafik naik
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '80vh', 
      justifyContent: 'space-between',
      gap: '2rem' 
    }}>
      
      {/* --- HEADER SIMPLE --- */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
         <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#e0e0e0', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <FaWallet style={{ color: '#00ff88' }} /> Keuangan RT
         </h1>
         <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#888' }}>Transparansi Anggaran & Laporan Kas</p>
      </div>

      {/* --- KONTEN UTAMA (COMING SOON) --- */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        background: 'linear-gradient(145deg, rgba(20,20,20,0.6), rgba(0,0,0,0.6))',
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 136, 0.1)',
        padding: '3rem 1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Background Glow Effect */}
        <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }}></div>

        {/* Ikon Gembok / Maintenance */}
        <div style={{ zIndex: 1, fontSize: '3rem', color: '#00ff88', marginBottom: '1.5rem', animation: 'float 3s ease-in-out infinite' }}>
            <FaLock />
        </div>

        {/* Teks Utama */}
        <h2 style={{ zIndex: 1, margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sistem Keuangan RT <br /> Akan Segera Hadir
        </h2>
        
        <p style={{ zIndex: 1, maxWidth: '500px', color: '#888', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            Fitur ini sedang dalam tahap pengembangan oleh tim teknis. Nantinya Anda dapat memantau pemasukan iuran, pengeluaran operasional, dan saldo kas RT secara realtime.
        </p>

        {/* Ilustrasi Grafik (Dummy) */}
        <div style={{ zIndex: 1, width: '100%', maxWidth: '600px', height: '200px', position: 'relative', opacity: 0.8 }}>
            <h4 style={{ textAlign: 'left', color: '#00ff88', fontSize: '0.8rem', marginBottom: '0.5rem', marginLeft: '1rem' }}>PREVIEW SYSTEM:</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dummyData}>
                    <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#00ff88' }}
                        formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                    />
                    <Area type="monotone" dataKey="saldo" stroke="#00ff88" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>

      </div>

      {/* --- FOOTER --- */}
      <footer style={{ 
          textAlign: 'center', 
          padding: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: '#555',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem'
      }}>
          <span>&copy; {new Date().getFullYear()} Sistem Administrasi RT.</span>
          <span style={{ color: '#00aaff', fontWeight: '600' }}>Web Engineer Niki Azis</span>
      </footer>

      {/* Animasi Floating untuk Ikon */}
      <style jsx global>{`
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
      `}</style>

    </div>
  );
}