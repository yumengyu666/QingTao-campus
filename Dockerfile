# ─── Stage 1: Build Frontend ───
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY qing-tao-campus/package*.json ./
RUN npm ci
COPY qing-tao-campus/ ./
RUN npm run build

# ─── Stage 2: Build Backend ───
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY qingtao-server/package*.json ./
RUN npm ci
COPY qingtao-server/ ./
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: Production Runtime ───
FROM node:20-alpine
WORKDIR /app

# Backend
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/prisma ./prisma
COPY --from=backend-build /app/package*.json ./

# Frontend (nginx serves from /app/qing-tao-campus/dist)
COPY --from=frontend-build /app/frontend/dist /app/qing-tao-campus/dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
