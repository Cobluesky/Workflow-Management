"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/Providers";

function LoginCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { consumeAccessToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const accessToken = searchParams.get("accessToken");

      if (!accessToken) {
        if (!cancelled) {
          setErrorMessage("소셜 로그인 토큰이 없습니다.");
        }
        return;
      }

      try {
        await consumeAccessToken(accessToken);

        if (!cancelled) {
          router.replace("/");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "소셜 로그인 처리에 실패했습니다.");
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [consumeAccessToken, router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Signing you in</h1>
          <p className="mt-2 text-sm text-gray-500">소셜 로그인 응답을 처리하고 있습니다.</p>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{errorMessage}</p>
            <Link href="/login" className="mt-2 inline-block font-semibold text-red-700 underline">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            잠시만 기다려 주세요.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 px-4 py-16">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Signing you in</h1>
              <p className="mt-2 text-sm text-gray-500">소셜 로그인 응답을 처리하고 있습니다.</p>
            </div>
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              잠시만 기다려 주세요.
            </div>
          </div>
        </div>
      }
    >
      <LoginCallbackContent />
    </Suspense>
  );
}
