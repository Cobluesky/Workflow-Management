"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const { data: session, update } = useSession(); 
  const router = useRouter();
  
  const [alias, setAlias] = useState((session?.user as any)?.alias || "");
  const [isLoading, setIsLoading] = useState(false);

  if (session === null) {
    router.push("/api/auth/signin");
    return null;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: (session?.user as any).id, newAlias: alias }),
      });

      if (res.ok) {
        alert("닉네임이 성공적으로 변경되었습니다!");
        await update({ alias }); // 세션 즉시 새로고침
        router.push("/");
      } else {
        alert("변경 실패");
      }
    } catch (error) {
      alert("오류 발생");
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">계정 이메일 (변경 불가)</label>
            <input type="text" disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" value={session?.user?.email || ""} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임 (Alias)</label>
            <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="멋진 닉네임을 지어주세요" value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors">
            {isLoading ? "저장 중..." : "정보 수정하기"}
          </button>
        </form>
      </div>
    </div>
  );
}