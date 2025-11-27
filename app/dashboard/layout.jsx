"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LuLayoutDashboard, LuUsers, LuWallet } from "react-icons/lu";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// --- MODAL UTAMA ---
const Modal = ({ isOpen, onClose, children, maxWidth = "600px" }) => {
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => setIsBrowser(true), []);
  if (!isBrowser || !isOpen) return null;
  return ReactDOM.createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: 'blur(8px)', padding: '1rem' }}>
      <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: maxWidth, maxHeight: "calc(100vh - 2rem)", overflowY: 'auto', boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
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
        <p style={{textAlign: 'center', color: '#aaa', margin: '2rem 0'}}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: '#ccc', fontWeight: '500', cursor: 'pointer', transition:'all 0.3s' }}>Batal</button>
            <button onClick={onConfirm} style={confirmStyle}>{confirmText}</button>
        </div>
    </div>
);

// --- MODAL PASSWORD ---
const PasswordPromptModal = ({ onVerify, onCancel, error, isLoading }) => {
    const [password, setPassword] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onVerify(password); };
    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{color: '#00eaff', textAlign: 'center', marginTop: 0, fontWeight:'600'}}>🔒 Akses Terbatas</h3>
            <p style={{textAlign: 'center', color: '#ccc', margin: '1rem 0 2rem 0', fontSize:'0.9rem'}}>Data Warga bersifat rahasia.<br/>Masukkan password Administrator.</p>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', textAlign: 'center', fontSize:'1.1rem', letterSpacing:'2px' }} autoFocus />
            {error && <p style={{color: '#ff4d4f', textAlign: 'center', marginTop: '1rem', fontSize:'0.85rem'}}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: '#ccc', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isLoading} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(145deg, #00eaff, #0077ff)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer', opacity: isLoading ? 0.7 : 1, boxShadow:'0 4px 15px rgba(0, 234, 255, 0.3)' }}>
                    {isLoading ? '...' : 'Buka Data'}
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
  
  const [isWargaUnlocked, setIsWargaUnlocked] = useState(false);
  const [showWargaPasswordModal, setShowWargaPasswordModal] = useState(false);
  const [wargaPasswordError, setWargaPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) { setUser(currentUser); } else { setUser(null); router.push("/login"); }
        setAuthLoading(false);
    });
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768); 
    checkScreenSize(); 
    window.addEventListener("resize", checkScreenSize); 
    return () => { unsubscribe(); window.removeEventListener("resize", checkScreenSize); }
  }, [router]);

  useEffect(() => {
    if (pathname === '/dashboard/warga') {
        if (!isWargaUnlocked && !showWargaPasswordModal) { setShowWargaPasswordModal(true); }
    } else {
        if (isWargaUnlocked) { setIsWargaUnlocked(false); setShowWargaPasswordModal(false); }
    }
  }, [pathname, isWargaUnlocked]);

  const menu = [
    { name: "Beranda", href: "/dashboard", icon: <LuLayoutDashboard /> },
    { name: "Data Warga", href: "/dashboard/warga", icon: <LuUsers /> },
    { name: "Keuangan RT", href: "/dashboard/keuangan", icon: <LuWallet /> },
  ];

  const handleLogout = async () => { 
      try { await signOut(auth); router.push("/login"); } catch (error) { console.error("Logout error", error); }
  };
  
  const handleLinkClick = () => { if (isMobile) { setMobileSidebarOpen(false); } };

  const verifyWargaPassword = async (password) => {
    setIsVerifying(true); setWargaPasswordError('');
    try {
        const response = await fetch('/api/verify-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        const data = await response.json();
        if (data.success) { setIsWargaUnlocked(true); setShowWargaPasswordModal(false); } 
        else { setWargaPasswordError(data.error || 'Password salah.'); }
    } catch (error) { setWargaPasswordError('Terjadi kesalahan koneksi.'); } 
    finally { setIsVerifying(false); }
  };

  const handleCancelPassword = () => {
      setShowWargaPasswordModal(false);
      if (pathname === '/dashboard/warga') { router.push('/dashboard'); }
  };

  const NavLink = ({ item, isMobileLink = false }) => {
    const isActive = pathname === item.href;
    const linkStyle = isMobileLink 
        ? { 
            padding: "0.8rem 1rem", 
            borderRadius: "8px", 
            background: isActive ? "rgba(0, 234, 255, 0.15)" : "transparent", 
            color: isActive ? "#00eaff" : "#888", 
            textDecoration: "none", display: "flex", alignItems: "center", gap: "0.8rem", border: isActive ? "1px solid rgba(0, 234, 255, 0.2)" : "1px solid transparent"
          } 
        : { 
            padding: "0.5rem 1rem", 
            color: isActive ? "#fff" : "#888", 
            textDecoration: "none", 
            borderBottom: isActive ? "2px solid #00eaff" : "2px solid transparent", 
            transition: "all 0.2s", fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' 
        };

    return (
        <Link 
            href={item.href} onClick={handleLinkClick} style={linkStyle}
            onMouseEnter={(e) => (!isActive && !isMobileLink) && (e.target.style.color = "#ccc")}
            onMouseLeave={(e) => (!isActive && !isMobileLink) && (e.target.style.color = "#888")}
        > 
            <span style={{ fontSize: isMobileLink ? "1.2rem" : "1.1rem", display: 'flex' }}>{item.icon}</span> 
            <span>{item.name}</span> 
        </Link>
    );
  };

  if (authLoading) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#000', color:'#00eaff'}}>Memuat Sistem...</div>;

  const showContent = !pathname.includes('/dashboard/warga') || isWargaUnlocked;

  return (
    <>
      <style jsx global>{`
          @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); } } 
          * { box-sizing: border-box; }
          body { margin: 0; background: #050505; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
      `}</style>
      
      <div style={{ minHeight: "100vh", display: 'flex', flexDirection: 'column' }}>
        
        {/* TOPBAR */}
        <header style={{ background: "rgba(10,10,10,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: isMobile ? "0 1rem" : "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                {isMobile ? (
                    <button onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>☰</button>
                ) : (
                    <h2 style={{ fontSize: "1.2rem", fontWeight: "700", letterSpacing: '1px', color:'#fff', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                       <span style={{color:'#00eaff'}}>Dashboard</span>RT. 02
                    </h2>
                )}
                {!isMobile && (
                    <nav style={{ display: "flex", gap: "0.5rem" }}>
                        {menu.map((item) => <NavLink key={item.href} item={item} />)}
                    </nav>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '8px', height: '8px', background: '#00ff88', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                    <span style={{ fontWeight: '500', color: '#888', fontSize: '0.85rem' }}>{user ? user.email : ''}</span>
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} style={{ background: 'transparent', border: '1px solid #333', color: '#ff4d4f', padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize:'0.8rem', transition: 'all 0.2s' }}>Keluar</button>
            </div>
        </header>

        {/* SIDEBAR MOBILE */}
        {isMobile && (
            <aside style={{ width: "260px", background: "#111", borderRight: "1px solid rgba(255,255,255,0.1)", padding: "2rem 1rem", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform 0.3s ease", position: "fixed", left: 0, top: 0, height: "100vh", transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)", zIndex: 110 }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", color:'#fff' }}>MENU</h2>
                        <button onClick={() => setMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {menu.map((item) => <NavLink key={item.href} item={item} isMobileLink={true} />)}
                    </nav>
                </div>
                
                {/* --- FOOTER SIDEBAR SESUAI REQUEST --- */}
                <div style={{ fontSize:'0.75rem', color:'#555', textAlign:'center', lineHeight:'1.5', marginTop:'auto' }}>
                    &copy; {new Date().getFullYear()} All rights reserved <br/>
                    <span style={{ color:'#888', fontWeight:'600' }}>FullStack Engineer - Niki Azis</span>
                </div>
            </aside>
        )}
        {isMobile && mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 105, backdropFilter:'blur(2px)' }} />}
        
        {/* MAIN CONTENT AREA */}
        <main style={{ padding: isMobile ? "1rem" : "2rem", width: '100%', maxWidth: '1600px', margin: '0 auto', flex: 1 }}>
            {showContent ? children : (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', color:'#444', flexDirection:'column', gap:'1.5rem' }}>
                    <div style={{ fontSize: '4rem', opacity:0.3 }}>🔒</div>
                    <div style={{fontWeight:'500'}}>Konten Terkunci</div>
                </div>
            )}
        </main>
        
        <Modal isOpen={showWargaPasswordModal} onClose={handleCancelPassword} maxWidth="400px"><PasswordPromptModal onVerify={verifyWargaPassword} onCancel={handleCancelPassword} error={wargaPasswordError} isLoading={isVerifying} /></Modal>
        <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} maxWidth="350px"><ConfirmationModal onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} title="Logout" message="Akhiri sesi administrator?" confirmText="Ya, Logout" confirmStyle={{ padding: '0.75rem 1.5rem', background: '#ff4d4f', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow:'0 4px 15px rgba(255, 77, 79, 0.3)' }} /></Modal>
      </div>
    </>
  );
}