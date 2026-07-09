# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (não ci): resolve os binários nativos do Rollup/esbuild p/ linux-musl
# — o lockfile gerado no Windows não inclui os optional deps de Linux.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- serve (nginx estático, SPA) ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
