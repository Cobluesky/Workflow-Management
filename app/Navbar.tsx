"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession(); 

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 tracking-tight">
          <span className="text-2xl">🗓️</span>
          MyTimeTable
        </Link>
        
        <div className="flex items-center gap-6 text-sm font-medium">
          {session === undefined ? (
            <div className="text-gray-400">로딩중...</div>
          ) : session ? (
            // 로그인 된 상태 
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-semibold">
                {(session.user as any)?.alias || session.user?.email?.split('@')[0]}님
              </span>
              
              <Link 
                href="/mypage" 
                className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
              >
                ⚙️ 마이페이지
              </Link>

              <button 
                onClick={() => signOut({ callbackUrl: '/' })} 
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          ) : (
            // 로그아웃 상태
            <div className="flex items-center gap-4">
              <Link href="/signup" className="hover:text-indigo-600 transition-colors">
                회원가입
              </Link>
              <button 
                onClick={() => signIn()} 
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}