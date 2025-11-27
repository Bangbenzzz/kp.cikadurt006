"use client";
import { useMemo } from "react";
import { FaWallet, FaArrowUp, FaArrowDown, FaExchangeAlt } from "react-icons/fa";

export default function SummarySection({ transaksi, loading }) {
  const stats = useMemo(() => {
    let totalMasuk = 0;
    let totalKeluar = 0;
    transaksi.forEach(t => {
        const val = Number(t.nominal);
        if (t.tipe === 'masuk') totalMasuk += val;
        else totalKeluar += val;
    });
    const saldoAkhir = totalMasuk - totalKeluar;
    const totalTransaksi = transaksi.length;
    return { totalMasuk, totalKeluar, saldoAkhir, totalTransaksi };
  }, [transaksi]);

  const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
       <style jsx>{`
         .stat-card { 
            background: rgba(15,15,15,0.8); 
            border: 1px solid rgba(255,255,255,0.05); 
            border-radius: 12px; 
            padding: 1.5rem; /* Padding diperbesar sedikit */
            display: flex; 
            flex-direction: column; /* Pastikan susunan ke bawah */
            justify-content: space-between; /* Jarak atas bawah merata */
            gap: 15px; /* JARAK TEGAS ANTARA JUDUL DAN ANGKA */
            min-height: 110px; /* Tinggi minimum agar tidak gepeng */
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
         }
         .grid-stats-responsive { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 1rem; 
         }
         /* Label Judul */
         .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
         }
         /* Angka Besar */
         .card-value {
            font-size: clamp(1.1rem, 2.5vw, 1.5rem);
            font-weight: 800;
            color: #fff;
            line-height: 1.2;
            word-break: break-word; /* Agar angka panjang turun ke bawah jika sempit */
         }
         @media (max-width: 768px) { 
            .grid-stats-responsive { 
                grid-template-columns: 1fr 1fr; 
                gap: 0.8rem; 
            } 
            .stat-card {
                padding: 1rem;
                gap: 10px;
            }
         }
       `}</style>

       {/* HEADER */}
       <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#00eaff', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaWallet /> KEUANGAN RT. 02
            </h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>Modul Bendahara & Laporan Kas</p>
       </div>

       {/* KARTU STATISTIK */}
       <div className="grid-stats-responsive">
          {/* SISA SALDO */}
          <div className="stat-card" style={{ borderLeft: '4px solid #00eaff', background: 'linear-gradient(135deg, rgba(0, 234, 255, 0.1), rgba(15,15,15,0.8))' }}>
              <div className="card-header">
                  <span style={{color:'#00eaff', fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px'}}>Sisa Saldo</span>
                  <div style={{background:'rgba(0, 234, 255, 0.2)', padding:'6px', borderRadius:'6px', display:'flex'}}>
                    <FaWallet style={{color:'#00eaff', fontSize:'0.9rem'}} />
                  </div>
              </div>
              <div className="card-value" style={{textShadow:'0 0 15px rgba(0, 234, 255, 0.4)'}}>
                  {loading ? "..." : formatRp(stats.saldoAkhir)}
              </div>
          </div>

          {/* PEMASUKAN */}
          <div className="stat-card" style={{ borderLeft: '4px solid #00ff88' }}>
              <div className="card-header">
                  <span style={{color:'#aaa', fontSize:'0.75rem', fontWeight:'600', textTransform:'uppercase'}}>Pemasukan</span>
                  <FaArrowUp style={{color:'#00ff88', fontSize:'0.9rem'}} />
              </div>
              <div className="card-value">
                  {formatRp(stats.totalMasuk)}
              </div>
          </div>

          {/* PENGELUARAN */}
          <div className="stat-card" style={{ borderLeft: '4px solid #ff0055' }}>
              <div className="card-header">
                  <span style={{color:'#aaa', fontSize:'0.75rem', fontWeight:'600', textTransform:'uppercase'}}>Pengeluaran</span>
                  <FaArrowDown style={{color:'#ff0055', fontSize:'0.9rem'}} />
              </div>
              <div className="card-value">
                  {formatRp(stats.totalKeluar)}
              </div>
          </div>

          {/* TOTAL AKTIVITAS */}
          <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="card-header">
                  <span style={{color:'#aaa', fontSize:'0.75rem', fontWeight:'600', textTransform:'uppercase'}}>Total Aktivitas</span>
                  <FaExchangeAlt style={{color:'#f59e0b', fontSize:'0.9rem'}} />
              </div>
              <div className="card-value">
                  {stats.totalTransaksi} <span style={{fontSize:'0.9rem', color:'#888', fontWeight:'400'}}>Tx</span>
              </div>
          </div>
       </div>
    </div>
  );
}