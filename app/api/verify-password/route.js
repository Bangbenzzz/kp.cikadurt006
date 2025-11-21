import { NextResponse } from 'next/server';

// --- KONFIGURASI BARU: MATIKAN CACHE SERVER ---
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// ----------------------------------------------

export async function POST(request) {
  try {
    const { password } = await request.json();
    
    // WARGA_ACCESS_PASSWORD tidak memiliki NEXT_PUBLIC_ karena hanya berjalan di server
    const correctPassword = process.env.WARGA_ACCESS_PASSWORD;

    if (!correctPassword) {
      console.error("WARGA_ACCESS_PASSWORD tidak diatur di .env.local atau Vercel Environment Variables");
      return NextResponse.json({ success: false, error: "Konfigurasi server error. Harap hubungi admin." }, { status: 500 });
    }

    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Password salah. Silakan coba lagi." });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }
}