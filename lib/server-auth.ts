import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_SERVER_URL, LOCAL_AUTH_PLACEHOLDER_PASSWORD } from "@/lib/auth-config";

interface VerifiedAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface RequireAppUserResult {
  authUser: VerifiedAuthUser;
  localUser: {
    id: number;
    email: string;
    alias: string | null;
  };
  accessToken: string;
}

function getAccessTokenFromRequest(req: Request) {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function buildUnauthorizedResponse(code: string, message: string, status = 401) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

export async function requireAppUser(req: Request): Promise<RequireAppUserResult | NextResponse> {
  const accessToken = getAccessTokenFromRequest(req);

  if (!accessToken) {
    return buildUnauthorizedResponse("UNAUTHORIZED", "액세스 토큰이 필요합니다.");
  }

  let verifyResponse: Response;

  try {
    verifyResponse = await fetch(`${AUTH_SERVER_URL}/api/v1/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    return buildUnauthorizedResponse(
      "AUTH_SERVER_UNAVAILABLE",
      "인증 서버와 통신할 수 없습니다.",
      502
    );
  }

  if (!verifyResponse.ok) {
    return buildUnauthorizedResponse("INVALID_ACCESS_TOKEN", "유효하지 않은 액세스 토큰입니다.");
  }

  const payload = await verifyResponse.json();
  const authUser = payload?.data?.user as VerifiedAuthUser | undefined;

  if (!authUser?.email) {
    return buildUnauthorizedResponse("INVALID_AUTH_USER", "인증 사용자 정보를 확인할 수 없습니다.");
  }

  const localUser = await prisma.user.upsert({
    where: { email: authUser.email },
    update: {},
    create: {
      email: authUser.email,
      password: LOCAL_AUTH_PLACEHOLDER_PASSWORD,
      alias: null,
    },
    select: {
      id: true,
      email: true,
      alias: true,
    },
  });

  return {
    authUser,
    localUser,
    accessToken,
  };
}
