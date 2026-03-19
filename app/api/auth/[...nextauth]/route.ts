import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "이메일 로그인",
      credentials: {
        email: { label: "이메일", type: "email", placeholder: "test@test.com" },
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해주세요.");
        }

        // 1. DB에서 유저 찾기
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.");
        }

        // 2. 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다."); // 보안상 동일한 메시지 출력
        }

        // 로그인 성공 시 유저 정보 반환
        return { id: user.id.toString(), email: user.email, alias: user.alias };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  // 토큰에서 ID를 꺼내 세션에 담기
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.alias = (user as any).alias;
      }

      if (trigger === "update" && session?.alias) {
        token.alias = session.alias;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).alias = token.alias;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };