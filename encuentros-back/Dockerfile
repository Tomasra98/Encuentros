# Stage 1: Construir la aplicación Node.js (NestJS)

FROM node:20-alpine AS build

# Definir el directorio de trabajo
WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias
RUN npm ci --silent

# Copiamos el resto de la aplicación
COPY . .

# Construimos la aplicación
RUN npm run build

# Stage 2: Servir la aplicación con Node.js
FROM node:20-alpine

# Definir el directorio de trabajo
WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos solo las dependencias de producción
RUN npm ci --only=production --silent

# Copia los archivos generados en el build
COPY --from=build /app/dist ./dist

# Exponemos el puerto 3000
EXPOSE 3000

# Establecer la variable de entorno para producción
ENV NODE_ENV=production

# Comando CMD para ejecutar la aplicación
CMD ["node", "dist/main"]
