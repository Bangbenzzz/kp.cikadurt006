"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Import Auth Firebase
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" }); // Ubah username jadi email
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Tambah loading state
  const [showPassword, setShowPassword] = useState(false);
  const year = new Date().getFullYear();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // LOGIC LOGIN AMAN FIREBASE
      await signInWithEmailAndPassword(auth, form.email, form.password);
      // Jika berhasil, Firebase otomatis simpan sesi, kita cuma perlu redirect
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      // Pesan error bahasa indonesia
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
         setError("Email atau Password salah!");
      } else if (err.code === 'auth/too-many-requests') {
         setError("Terlalu banyak percobaan. Coba lagi nanti.");
      } else {
         setError("Terjadi kesalahan sistem.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "radial-gradient(circle at top, #0a0a0a 0%, #000 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#e0e0e0",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: "-200px", left: "-200px", width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(0,128,255,0.25) 0%, transparent 70%)",
          filter: "blur(100px)", zIndex: 0,
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative", zIndex: 1,
          background: "rgba(20,20,20,0.7)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 20px rgba(0,255,255,0.08), 0 0 60px rgba(0,128,255,0.05)",
          borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "420px",
          display: "flex", flexDirection: "column", gap: "1.2rem",
        }}
      >
        <h2
          style={{
            textAlign: "center", fontSize: "1.7rem", fontWeight: "600",
            background: "linear-gradient(to right, #00eaff, #0077ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: ".5rem",
          }}
        >
          Kp. Cikadu RT. 02
        </h2>

        {/* Field Email */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: ".9rem", color: "#aaa", marginBottom: "0.3rem" }}>
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Masukan Email"
            required
            style={{
              background: "rgba(0,0,0,0.6)", border: "1px solid #222",
              color: "#fff", borderRadius: "8px", padding: "0.8rem",
              outline: "none", transition: "border 0.2s",
            }}
            onFocus={(e) => (e.target.style.border = "1px solid #00aaff")}
            onBlur={(e) => (e.target.style.border = "1px solid #222")}
          />
        </div>

        {/* Field Password */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: ".9rem", color: "#aaa", marginBottom: "0.3rem" }}>
            Password
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Masukan Password"
              required
              style={{
                width: "100%", background: "rgba(0,0,0,0.6)", border: "1px solid #222",
                color: "#fff", borderRadius: "8px", padding: "0.8rem 3.2rem 0.8rem 0.8rem",
                outline: "none", transition: "border 0.2s",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid #00aaff")}
              onBlur={(e) => (e.target.style.border = "1px solid #222")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
                fontSize: ".8rem", background: "transparent", border: "none",
                color: "#00aaff", cursor: "pointer", fontWeight: "500",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: ".9rem", textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "0.5rem", padding: "0.75rem", borderRadius: "8px",
            background: "linear-gradient(145deg, #0a84ff, #0066cc)",
            border: "1px solid #0a84ff", color: "#fff", fontWeight: "600",
            cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        >
          {loading ? "Memproses..." : "Login"}
        </button>
      </form>

      <footer style={{ marginTop: "2rem", textAlign: "center", color: "#555", fontSize: ".85rem", zIndex: 1 }}>
        © {year} RT Admin System. All rights reserved
      </footer>
    </div>
  );
}