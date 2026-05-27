FROM oven/bun:1-alpine

RUN apk add --no-cache nodejs openssl python3 make g++

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

ENV NODE_ENV=production
EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
