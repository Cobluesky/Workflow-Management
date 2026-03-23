"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/Providers";

export default function MyPage() {
  const { user, accessToken, isLoading: authLoading, updateAlias } = useAuth();
  const router = useRouter();
  const [alias, setAlias] = useState(user?.alias || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAlias(user?.alias || "");
  }, [user?.alias]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newAlias: alias }),
      });

      if (res.ok) {
        updateAlias(alias);
        router.push("/");
      } else {
        alert("별명 변경에 실패했습니다.");
      }
    } catch (error) {
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">마이페이지</h1>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
              value={user?.email || ""}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">별명</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="사용할 별명을 입력하세요"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors"
          >
            {isLoading ? "저장 중..." : "정보 수정"}
          </button>
        </form>
      </div>
    </div>
  );
}
