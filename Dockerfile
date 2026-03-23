# 1. Base 이미지
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 2. 패키지 설치 단계
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 3. 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN --mount=type=secret,id=DATABASE_URL \
    --mount=type=secret,id=AUTH_SERVER_URL \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    AUTH_SERVER_URL="$(cat /run/secrets/AUTH_SERVER_URL)" \
    NEXT_PUBLIC_AUTH_SERVER_URL="$(cat /run/secrets/AUTH_SERVER_URL)" \
    npm run build

# 4. 프로덕션 실행 단계
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
ENV PORT 3000
CMD ["npm", "start"]
