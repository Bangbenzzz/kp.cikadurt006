"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
// Import Auth Firebase yang benar
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";

// Konfigurasi agar halaman tidak nyangkut cache (Fresh)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// --- MODAL UTAMA ---
const Modal = ({ isOpen, onClose, children, maxWidth = "600px" }) => {
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => setIsBrowser(true), []);
  if (!isBrowser || !isOpen) return null;
  return ReactDOM.createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: 'blur(5px)', padding: '1rem' }}>
      <div style={{ background: "rgba(30,30,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: maxWidth, maxHeight: "calc(100vh - 2rem)", overflowY: 'auto', boxShadow: "0 0 40px rgba(0,255,255,0.15)", boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// --- MODAL KONFIRMASI ---
const ConfirmationModal = ({ onConfirm, onCancel, title, message, confirmText, confirmStyle }) => (
    <div>
        <h3 style={{color: confirmStyle?.color || '#fff', textAlign: 'center', marginTop: 0}}>{title}</h3>
        <p style={{textAlign: 'center', color: '#ccc', margin: '2rem 0'}}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap-reverse' }}>
            <button onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '8px', color: '#ccc', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
            <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button>
        </div>
    </div>
);

// --- MODAL PASSWORD (DATA WARGA) ---
const PasswordPromptModal = ({ onVerify, onCancel, error, isLoading }) => {
    const [password, setPassword] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onVerify(password); };
    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{color: '#00aaff', textAlign: 'center', marginTop: 0}}>Akses Terbatas</h3>
            <p style={{textAlign: 'center', color: '#ccc', margin: '1rem 0 2rem 0'}}>Silakan masukkan password untuk mengakses data warga.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.6)', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} autoFocus />
            {error && <p style={{color: '#ff4d4f', textAlign: 'center', marginTop: '1rem'}}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap-reverse' }}>
                <button type="button" onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '8px', color: '#ccc', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #0a84ff, #0066cc)', border: '1px solid #0a84ff', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                    {isLoading ? 'Memverifikasi...' : 'Buka'}
                </button>
            </div>
        </form>
    );
};

// --- LAYOUT UTAMA ---
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState(null); 
  const [authLoading, setAuthLoading] = useState(true); 
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // State Proteksi Data Warga
  const [isWargaUnlocked, setIsWargaUnlocked] = useState(false);
  const [showWargaPasswordModal, setShowWargaPasswordModal] = useState(false);
  const [wargaPasswordError, setWargaPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            setUser(null);
            router.push("/login");
        }
        setAuthLoading(false);
    });

    const checkScreenSize = () => setIsMobile(window.innerWidth < 768); 
    checkScreenSize(); 
    window.addEventListener("resize", checkScreenSize); 
    return () => {
        unsubscribe(); 
        window.removeEventListener("resize", checkScreenSize);
    }
  }, [router]);

  useEffect(() => {
    // Kunci kembali jika pindah halaman selain /dashboard/warga
    if (pathname !== '/dashboard/warga' && isWargaUnlocked) {
      setIsWargaUnlocked(false);
    }
  }, [pathname, isWargaUnlocked]);

  const menu = [
    { name: "Beranda", href: "/dashboard", icon: "🏠", protected: false },
    { name: "Data Warga", href: "/dashboard/warga", icon: "👥", protected: true },
    { name: "Keuangan RT", href: "/dashboard/keuangan", icon: "💰", protected: false },
  ];

  const handleLogout = async () => { 
      try {
          await signOut(auth);
          router.push("/login");
      } catch (error) {
          console.error("Logout error", error);
      }
  };
  
  const handleWargaLinkClick = (e) => {
    if (pathname === '/dashboard/warga') return;
    if (!isWargaUnlocked) { 
        e.preventDefault(); 
        setShowWargaPasswordModal(true); 
    }
    if (isMobile) { setMobileSidebarOpen(false); }
  };

  const verifyWargaPassword = async (password) => {
    setIsVerifying(true);
    setWargaPasswordError('');
    try {
        const response = await fetch('/api/verify-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        const data = await response.json();
        if (data.success) { 
            setIsWargaUnlocked(true); 
            setShowWargaPasswordModal(false); 
            router.push('/dashboard/warga'); 
        } else { 
            setWargaPasswordError(data.error || 'Password salah. Silakan coba lagi.'); 
        }
    } catch (error) { 
        setWargaPasswordError('Terjadi kesalahan. Periksa koneksi Anda.'); 
    } finally { 
        setIsVerifying(false); 
    }
  };

  const NavLink = ({ item, isMobileLink = false }) => {
    const clickHandler = item.protected 
        ? handleWargaLinkClick 
        : (isMobile ? () => setMobileSidebarOpen(false) : undefined);
        
    const linkStyle = isMobileLink 
        ? { 
            padding: "0.75rem", 
            borderRadius: "10px", 
            background: pathname === item.href ? "linear-gradient(145deg, #0a84ff, #0066cc)" : "transparent", 
            color: pathname === item.href ? "#fff" : "#888", 
            textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" 
          } 
        : { 
            padding: "0.5rem 1rem", 
            color: pathname === item.href ? "#fff" : "#888", 
            textDecoration: "none", 
            borderBottom: pathname === item.href ? "2px solid #00aaff" : "2px solid transparent", 
            transition: "all 0.2s", fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' 
        };

    return (
        <Link 
            href={item.href} 
            onClick={clickHandler}
            style={linkStyle}
            onMouseEnter={(e) => (pathname !== item.href && !isMobileLink) && (e.target.style.color = "#fff")}
            onMouseLeave={(e) => (pathname !== item.href && !isMobileLink) && (e.target.style.color = "#888")}
        > 
            {isMobileLink && <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>} 
            <span>{item.name}</span> 
        </Link>
    );
  };

  if (authLoading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#000', color:'#fff'}}>Memuat Sistem...</div>;

  return (
    <>
      {/* Style untuk Animasi Pulse Dot Hijau */}
      <style jsx global>{`
          @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); } } 
          * { box-sizing: border-box; }
      `}</style>
      
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0a 0%, #000 100%)", color: "#e0e0e0" }}>
        
        {/* HEADER ASLI YANG ANDA SUKA */}
        <header style={{ background: "rgba(15,15,15,0.8)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: isMobile ? "0 1rem" : "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                {isMobile ? (
                    <button onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#00aaff', fontSize: '1.5rem', cursor: 'pointer' }}>☰</button>
                ) : (
                    // JUDUL KEMBALI KE AWAL
                    <h2 style={{ fontSize: "1.3rem", fontWeight: "600", background: "linear-gradient(to right, #00eaff, #0077ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Kp. Cikadu RT. 06</h2>
                )}
                {!isMobile && (
                    <nav style={{ display: "flex", gap: "0.5rem" }}>
                        {menu.map((item) => <NavLink key={item.href} item={item} />)}
                    </nav>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: 'wrap' }}>
                {/* DOT KELAP KELIP KEMBALI */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', background: '#00ff88', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                    <span style={{ fontWeight: '500', color: '#ccc', fontSize: isMobile ? '0.8rem' : '1rem' }}>
                        {user ? user.email : 'Memuat...'}
                    </span>
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} style={{ background: 'rgba(255,77,79,0.1)', border: '1px solid #ff4d4f', color: '#ff4d4f', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = 'rgba(255,77,79,0.2)'} onMouseLeave={(e) => e.target.style.background = 'rgba(255,77,79,0.1)'}>Logout</button>
            </div>
        </header>

        {/* Sidebar Mobile */}
        {isMobile && (
            <aside style={{ width: "250px", background: "rgba(15,15,15,0.95)", backdropFilter: "blur(10px)", padding: "2rem 1rem", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform 0.3s ease", position: "fixed", left: 0, top: 0, height: "100vh", transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)", zIndex: 110 }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: "1.3rem", fontWeight: "600", background: "linear-gradient(to right, #00eaff, #0077ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Menu</h2>
                        <button onClick={() => setMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {menu.map((item) => <NavLink key={item.href} item={item} isMobileLink={true} />)}
                    </nav>
                </div>
            </aside>
        )}

        {isMobile && mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 105 }} />}
        
        <main style={{ padding: isMobile ? "1rem" : "2rem", width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ background: "rgba(20,20,20,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: isMobile ? "1.5rem" : "2rem", boxShadow: "0 0 30px rgba(0,255,255,0.05)" }}>
                {children}
            </div>
        </main>
        
        <Modal isOpen={showWargaPasswordModal} onClose={() => setShowWargaPasswordModal(false)} maxWidth="450px"><PasswordPromptModal onVerify={verifyWargaPassword} onCancel={() => setShowWargaPasswordModal(false)} error={wargaPasswordError} isLoading={isVerifying} /></Modal>
        <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} maxWidth="400px"><ConfirmationModal onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} title="Konfirmasi Logout" message="Apakah Anda yakin ingin keluar dari sesi ini?" confirmText="Ya, Logout" confirmStyle={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg, #ff4d4f, #b30021)', border: '1px solid #ff4d4f', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' }} /></Modal>
      </div>
    </>
  );
}