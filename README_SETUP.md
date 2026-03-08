# Setup Script for FusionArte

This script will initialize your database and environment.

## 1. Prerequisites
- Node.js installed
- A PostgreSQL database running (or you can switch to SQLite)

## 2. Configuration
If you want to use **SQLite** (much easier for local testing), follow these steps:
1. Open `prisma/schema.prisma`.
2. Change `provider = "postgresql"` to `provider = "sqlite"`.
3. Change `url = env("DATABASE_URL")` to `url = "file:./dev.db"`.
4. Delete the `.env` file or comment out `DATABASE_URL`.

## 3. Installation & Initialization

Run these commands in your terminal:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create/Sync database schema
# (This will create the tables in your DB)
npx prisma db push

# Seed the database with initial data
# (Adds admin, teachers, styles, and levels)
npx prisma db seed

# Start the development server
npm run dev
```

## 4. Default Credentials
After seeding, you can log in with:
- **Admin**: `admin@fusionarte.com` / `password123`
- **Profesor**: `profesor@fusionarte.com` / `password123`
- **Socio**: `socio@fusionarte.com` / `password123`
- **Estudiante**: `estudiante@fusionarte.com` / `password123`

## 5. What was fixed?
- **Attendance Persistence**: Record saves to database successfully.
- **Root Layout Refactor**: Better SEO and metadata handling.
- **API Security Base**: Added helper in `src/lib/auth-server.ts`.
- **Unique Records**: Prevented duplicate attendance entries.
