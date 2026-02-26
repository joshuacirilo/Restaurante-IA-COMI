# Restaurante IA COMI - Next.js + Prisma 6

Arquitectura base para trabajar con Next.js (App Router) y Prisma 6.

## 1) Instalar dependencias

```bash
npm install
```

## 2) Preparar variables de entorno

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## 3) Generar cliente y migrar base de datos

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 4) Ejecutar en desarrollo

```bash
npm run dev
```

## Estructura

- `app/`: rutas, páginas y handlers API (App Router).
- `lib/prisma.ts`: singleton de PrismaClient para evitar múltiples conexiones en dev.
- `prisma/schema.prisma`: modelos y datasource.

## Endpoint de prueba

- `GET /api/health`: valida API + conexión DB.
