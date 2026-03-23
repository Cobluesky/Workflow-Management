"use client";

import Link from "next/link";
import { useAuth } from "@/app/Providers";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-600">
          <span className="text-2xl">M</span>
          MyTimeTable
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          {isLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-700">
                {user.alias || user.name || user.email.split("@")[0]}
              </span>

              <Link
                href="/mypage"
                className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                My Page
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/signup" className="transition-colors hover:text-indigo-600">
                Sign up
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-indigo-50 px-4 py-2 text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
