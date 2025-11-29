"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LuLayoutDashboard, LuUsers, LuWallet } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

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

// --- MODAL PASSWORD (ANTI POP-UP CHROME: JURUS FINAL) ---
const PasswordPromptModal = ({ onVerify, onCancel, error, isLoading }) => {
    const [password, setPassword] = useState('');

    // Karena kita menghapus tag <form>, kita harus handle tombol Enter manual
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onVerify(password);
        }
    };

    return (
        // TRIK 1: Ganti <form> jadi <div> agar Chrome tidak mendeteksi event 'submit'
        <div style={{ width: '100%' }}>
            <h3 style={{color: '#00eaff', textAlign: 'center', marginTop: 0, fontWeight:'600'}}>🔒 Akses Terbatas</h3>
            <p style={{textAlign: 'center', color: '#ccc', margin: '1rem 0 2rem 0', fontSize:'0.9rem'}}>Data Warga bersifat rahasia<br/>Masukkan password</p>
            
            <input 
                // TRIK 2: Pakai type="text" bukan "password". Chrome tidak akan simpan sandi untuk text biasa.
                type="text" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyDown={handleKeyDown} // Handle Enter key
                placeholder="Masukkan password" 
                style={{ 
                    width: '100%', 
                    padding: '0.8rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    borderRadius: '8px', 
                    outline: 'none', 
                    textAlign: 'center', 
                    fontSize:'1rem', 
                    letterSpacing:'2px',
                    // TRIK 3: Ini kuncinya! Membuat text biasa terlihat seperti titik-titik password
                    WebkitTextSecurity: 'disc', 
                    MozTextSecurity: 'circle', // Fallback untuk browser lain (opsional)
                }} 
                autoFocus 
                autoComplete="off"
            />
            
            {error && <p style={{color: '#ff4d4f', textAlign: 'center', marginTop: '1rem', fontSize:'0.85rem'}}>{error}</p>}
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: '#ccc', cursor: 'pointer' }}>Batal</button>
                
                {/* Tombol type="button" agar tidak dianggap submit */}
                <button 
                    type="button" 
                    onClick={() => onVerify(password)}
                    disabled={isLoading} 
                    style={{ padding: '0.75rem 2rem', background: 'linear-gradient(145deg, #00eaff, #0077ff)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer', opacity: isLoading ? 0.7 : 1, boxShadow:'0 4px 15px rgba(0, 234, 255, 0.3)' }}
                >
                    {isLoading ? 'Loading...' : 'Buka Data'}
                </button>
            </div>
        </div>
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

  // --- LOGIC DISPLAY NAMA (Sesuai Request) ---
  const getDisplayName = (email) => {
    if (!email) return '';
    if (email === 'elzaadm@rt.com') return 'ELZA ADHA SHAHILLA';
    if (email === 'dedisuryadi@ketuart.com') return 'DEDI SURYADI';
    return email; 
  };

  const NavLink = ({ item, isMobileLink = false, index = 0 }) => {
    const isActive = pathname === item.href;
    
    let style = isMobileLink 
        ? { 
            padding: "1rem 2rem", 
            borderRadius: "50px", 
            background: isActive ? "rgba(0, 234, 255, 0.15)" : "transparent", 
            color: isActive ? "#00eaff" : "#bbb", 
            textDecoration: "none", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            gap: "1rem", 
            border: isActive ? "1px solid rgba(0, 234, 255, 0.3)" : "1px solid transparent",
            fontWeight: isActive ? '700' : '500',
            width: '80%', 
            maxWidth: '300px',
            fontSize: "1.1rem",
            opacity: mobileSidebarOpen ? 1 : 0,
            transform: mobileSidebarOpen ? "translateY(0)" : "translateY(30px)", 
            transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + (index * 0.1)}s, background 0.3s, border 0.3s` 
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
            href={item.href} onClick={handleLinkClick} style={style}
            onMouseEnter={(e) => (!isActive && !isMobileLink) && (e.target.style.color = "#ccc")}
            onMouseLeave={(e) => (!isActive && !isMobileLink) && (e.target.style.color = "#888")}
        > 
            <span style={{ fontSize: isMobileLink ? "1.4rem" : "1.1rem", display: 'flex' }}>{item.icon}</span> 
            <span>{item.name}</span> 
        </Link>
    );
  };

  if (authLoading) return <div style={{height:'100vh', width:'100%', background:'#050505'}}></div>;

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
        <header style={{ 
            background: "rgba(10,10,10,0.8)", 
            backdropFilter: "blur(12px)", 
            borderBottom: "1px solid rgba(255,255,255,0.05)", 
            padding: isMobile ? "0 1rem" : "0 2rem", 
            height: "64px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            position: "sticky", 
            top: 0, 
            zIndex: 100 
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                {isMobile ? (
                    <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} style={{ 
                        background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
                        transform: mobileSidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}>
                        {mobileSidebarOpen ? '✕' : '☰'}
                    </button>
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
                    <span style={{ fontWeight: '500', color: '#888', fontSize: '0.85rem' }}>
                        {user ? getDisplayName(user.email) : ''}
                    </span>
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} style={{ background: 'transparent', border: '1px solid #333', color: '#ff4d4f', padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize:'0.8rem', transition: 'all 0.2s' }}>Keluar</button>
            </div>
        </header>

        {/* SIDEBAR MOBILE */}
        {isMobile && (
            <>
                <aside style={{ 
                    position: "fixed", 
                    top: "50px", 
                    left: 0, 
                    width: "100%", 
                    height: "50vh", 
                    background: "rgba(10, 10, 10, 0.9)", 
                    backdropFilter: "blur(50px)",
                    WebkitBackdropFilter: "blur(50px)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 15px 50px rgba(0,0,0,0.6)",
                    transform: mobileSidebarOpen ? "translateY(0)" : "translateY(-150%)", 
                    opacity: mobileSidebarOpen ? 1 : 0,
                    transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease", 
                    zIndex: 90, 
                    display: "flex", 
                    flexDirection: "column", 
                    padding: "1.5rem"
                }}>
                    <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
                        {menu.map((item, i) => <NavLink key={item.href} item={item} isMobileLink={true} index={i} />)}
                    </nav>
                    
                    <div style={{ fontSize:'0.80rem', color:'#555', textAlign:'center', lineHeight:'1.5', marginTop:'auto', opacity: mobileSidebarOpen ? 1 : 0, transition: "opacity 1s ease 0.8s" }}>
                        &copy; {new Date().getFullYear()} KP. CIKADU RT. 02 RW. 19 <br/>
                        <span style={{ color:'#00eaff', fontWeight:'600', textShadow: '0 0 10px rgba(0, 234, 255, 0.3)' }}>FULLSTACK ENGINEER - NIKI AZIS</span>
                    </div>
                </aside>
                <div onClick={() => setMobileSidebarOpen(false)} style={{ position: "fixed", inset: 0, top: "64px", background: "rgba(0,0,0,0.6)", zIndex: 89, opacity: mobileSidebarOpen ? 1 : 0, pointerEvents: mobileSidebarOpen ? "auto" : "none", transition: "opacity 0.6s ease", backdropFilter:'blur(4px)' }} />
            </>
        )}
        
        {/* MAIN CONTENT AREA */}
        <main style={{ padding: isMobile ? "1rem" : "2rem", width: '100%', maxWidth: '1600px', margin: '0 auto', flex: 1, position: 'relative' }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ 
                        duration: 0.8, 
                        ease: [0.22, 1, 0.36, 1] 
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    {showContent ? children : (
                        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', color:'#444', flexDirection:'column', gap:'1.5rem' }}>
                            <div style={{ fontSize: '4rem', opacity:0.3 }}>🔒</div>
                            <div style={{fontWeight:'500'}}>Konten Terkunci</div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </main>
        
        <Modal isOpen={showWargaPasswordModal} onClose={handleCancelPassword} maxWidth="400px"><PasswordPromptModal onVerify={verifyWargaPassword} onCancel={handleCancelPassword} error={wargaPasswordError} isLoading={isVerifying} /></Modal>
        <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} maxWidth="350px"><ConfirmationModal onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} title="Logout" message="Apakah Anda Yakin Ingin Keluar?" confirmText="Ya, Logout" confirmStyle={{ padding: '0.75rem 1.5rem', background: '#ff4d4f', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow:'0 4px 15px rgba(255, 77, 79, 0.3)' }} /></Modal>
      </div>
    </>
  );
}