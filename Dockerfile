# syntax=docker/dockerfile:1

# ---- Build the frontend (Vue + Vite -> frontend/dist) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Build the backend (TypeScript -> backend/dist) ----
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- Runtime: one Node process serves the API, Socket.IO and the built frontend ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=backend-build /app/backend/dist ./dist
# backend/src/index.ts serves ../frontend/dist relative to the backend folder
COPY --from=frontend-build /app/frontend/dist ../frontend/dist
USER node
# Render (and most hosts) inject PORT; the app defaults to 3000 when it is unset
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
