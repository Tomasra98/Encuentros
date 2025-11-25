# Stage 1: Construir la aplicación Angular

# ===== Build stage (Usamos nodejs porque Angular se construye con Node) =====
FROM node:20-alpine AS build
# Directorio de trabajo
WORKDIR /app
# Copiamos los archivos de configuración de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm ci --silent

# Copiamos el resto de la aplicación
COPY . .

# Build de la aplicación Angular en producción
RUN npm run build -- --configuration=production

# Stage 2: Servir la aplicación con Nginx

# ===== Entorno de ejecución: Nginx para los archivos estáticos (SPA) =====
FROM nginx:stable-alpine

# Limpiar los archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia los artefactos del build al directorio de nginx
COPY --from=build /app/dist/encuentros-front/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80
EXPOSE 80

# Comandos CMD para ejecutar Nginx en primer plano y garantizar que el frontend siga activo
CMD ["nginx", "-g", "daemon off;"]
