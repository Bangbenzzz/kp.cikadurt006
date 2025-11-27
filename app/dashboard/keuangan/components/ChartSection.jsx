"use client";
import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';

export default function ChartSection({ transaksi }) {
  const chartData = useMemo(() => {
    const sorted = [...transaksi].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    let runningBalance = 0;
    return sorted.map(t => {
        const val = Number(t.nominal);
        runningBalance += t.tipe === 'masuk' ? val : -val;
        return { tanggal: t.tanggal, saldo: runningBalance, keterangan: t.keterangan };
    });
  }, [transaksi]);

  const formatRp = (num) => "Rp " + Number(num).toLocaleString("id-ID");

  return (
    <div style={{ 
        background: "rgba(15,15,15,0.6)", 
        border: '1px solid rgba(255,255,255,0.05)', 
        borderRadius: '16px', 
        padding: '1.5rem', 
        height: '300px', /* Tinggi ditambah agar chart tidak gepeng */
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
        <h4 style={{ 
            margin: '0 0 1.5rem', /* Jarak judul ke chart */
            color: '#ccc', 
            fontSize: '0.9rem', 
            fontWeight: 'bold',
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            flexShrink: 0
        }}>
            Grafik Pertumbuhan Kas
        </h4>
        
        {/* Container Chart dengan Flex 1 agar mengisi ruang sisa */}
        <div style={{ flex: 1, width: '100%', minWidth: 0, position: 'relative' }}>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSaldoReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00eaff" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#00eaff" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                            formatter={(value) => formatRp(value)} 
                            labelStyle={{ color: '#aaa', marginBottom: '0.5rem' }} 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="saldo" 
                            stroke="#00eaff" 
                            strokeWidth={3} 
                            fill="url(#colorSaldoReal)" 
                            activeDot={{ r: 6 }} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.9rem', border: '1px dashed #333', borderRadius: '8px' }}>
                    Belum ada data grafik
                </div>
            )}
        </div>
    </div>
  );
}