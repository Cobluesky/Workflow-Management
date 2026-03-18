# 1단계: 의존성 설치 (deps)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2단계: 빌드 (builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client 생성 후 Next.js 빌드 진행
RUN npx prisma generate
    
RUN --mount=type=secret,id=DATABASE_URL \
    --mount=type=secret,id=NEXTAUTH_SECRET \
    --mount=type=secret,id=NEXTAUTH_URL \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    NEXTAUTH_SECRET="$(cat /run/secrets/NEXTAUTH_SECRET)" \
    NEXTAUTH_URL="$(cat /run/secrets/NEXTAUTH_URL)" \
    npm run build

# 3단계: 실행 (runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 빌드된 결과물 중 실행에 꼭 필요한 파일 가져오기
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 서버 실행 명령어
CMD ["node", "server.js"]