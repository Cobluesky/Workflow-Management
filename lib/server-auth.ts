import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    authUserId: string | null;
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

function buildUpstreamErrorResponse(code: string, message: string, status = 502) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

function buildConflictResponse(code: string, message: string, status = 409) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

type LocalUserRecord = RequireAppUserResult["localUser"];

function localUserQueries(tx: Prisma.TransactionClient, authUser: VerifiedAuthUser) {
  return {
    findByAuthUserId: () =>
      tx.user.findUnique({
        where: { authUserId: authUser.id },
        select: {
          id: true,
          authUserId: true,
          email: true,
          alias: true,
        },
      }),
    findByEmail: () =>
      tx.user.findUnique({
        where: { email: authUser.email },
        select: {
          id: true,
          authUserId: true,
          email: true,
          alias: true,
        },
      }),
    update: (id: number, data: { authUserId?: string; email?: string }) =>
      tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          authUserId: true,
          email: true,
          alias: true,
        },
      }),
    create: () =>
      tx.user.create({
        data: {
          authUserId: authUser.id,
          email: authUser.email,
          password: LOCAL_AUTH_PLACEHOLDER_PASSWORD,
          alias: null,
        },
        select: {
          id: true,
          authUserId: true,
          email: true,
          alias: true,
        },
      }),
  };
}

async function resolveLocalUser(
  authUser: VerifiedAuthUser,
  attempt = 0
): Promise<LocalUserRecord | NextResponse> {
  try {
    return await prisma.$transaction(async (tx) => {
      const queries = localUserQueries(tx, authUser);
      const userByAuthUserId = await queries.findByAuthUserId();

      if (userByAuthUserId) {
        if (userByAuthUserId.email === authUser.email) {
          return userByAuthUserId;
        }

        const userByEmail = await queries.findByEmail();

        if (userByEmail && userByEmail.id !== userByAuthUserId.id) {
          return buildConflictResponse(
            "LOCAL_USER_CONFLICT",
            "인증 사용자와 로컬 사용자 매핑이 충돌했습니다."
          );
        }

        return queries.update(userByAuthUserId.id, {
          email: authUser.email,
        });
      }

      const userByEmail = await queries.findByEmail();

      if (userByEmail) {
        if (userByEmail.authUserId && userByEmail.authUserId !== authUser.id) {
          return buildConflictResponse(
            "LOCAL_USER_CONFLICT",
            "인증 사용자와 로컬 사용자 매핑이 충돌했습니다."
          );
        }

        return queries.update(userByEmail.id, {
          authUserId: authUser.id,
        });
      }

      return queries.create();
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      attempt < 1
    ) {
      return resolveLocalUser(authUser, attempt + 1);
    }

    throw error;
  }
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
  } catch {
    return buildUpstreamErrorResponse(
      "AUTH_SERVER_UNAVAILABLE",
      "인증 서버와 통신할 수 없습니다."
    );
  }

  if (!verifyResponse.ok) {
    if (verifyResponse.status >= 500) {
      return buildUpstreamErrorResponse(
        "AUTH_SERVER_UNAVAILABLE",
        "인증 서버 검증 요청에 실패했습니다."
      );
    }

    return buildUnauthorizedResponse("INVALID_ACCESS_TOKEN", "유효하지 않은 액세스 토큰입니다.");
  }

  const payload = await verifyResponse.json();
  const authUser = payload?.data?.user as VerifiedAuthUser | undefined;

  if (!authUser?.email) {
    return buildUnauthorizedResponse("INVALID_AUTH_USER", "인증 사용자 정보를 확인할 수 없습니다.");
  }

  const localUser = await resolveLocalUser(authUser);

  if (localUser instanceof NextResponse) {
    return localUser;
  }

  return {
    authUser,
    localUser,
    accessToken,
  };
}
