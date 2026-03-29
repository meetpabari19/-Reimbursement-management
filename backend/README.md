# ReimburseX Backend (Manager Dashboard)

This backend provides APIs for authentication (signup/login) and Manager Dashboard using PostgreSQL (Supabase DB URL).

## 1) Setup

1. Open this folder: `backend`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`:
   - `copy .env.example .env` (Windows PowerShell)
4. Edit `.env` and add the DB connection string (prefer pooler URL):
   - `DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require`
   - `JWT_SECRET=your_long_random_secret`
5. Start server:
   - `npm run dev`

## 2) Important: where to put database URL

In `backend/.env`, update:
- `DATABASE_URL` with your full Supabase pooler URL (recommended for local/dev networks)
- `JWT_SECRET` with a long random secret used for auth tokens

## 3) Auth API Endpoints

Base URL: `http://localhost:8080/api/auth`

- `POST /signup` body: `{ "name": "Anu", "email": "employee@reimbursex.com", "password": "123456", "role": "employee", "companyId": 1, "managerId": 2 }`
- `POST /login` body: `{ "email": "employee@reimbursex.com", "password": "123456" }`

Response for both:
- `{ "token": "...jwt...", "user": { ... } }`

Use token in manager APIs:
- `Authorization: Bearer <token>`

## 4) Manager API Endpoints

Base URL: `http://localhost:8080/api/manager`

- `GET /overview?managerId=<id>`
- `GET /expenses?managerId=<id>&page=1&pageSize=10&search=&status=&category=&sortBy=submitted_at&sortDir=desc`
- `PATCH /expenses/:expenseId/status` body: `{ "status": "approved|rejected|escalated", "managerId": "<id>" }`
- `POST /expenses/bulk-status` body: `{ "expenseIds": [1,2], "status": "approved", "managerId": "<id>" }`
- `GET /team-summary?managerId=<id>`
- `GET /rules?companyId=<id>`

## 5) Notes

- The backend assumes an `expenses` table with manager-related rows.
- If your friend's table names differ, change them in `.env`.
- If column names differ, update mappings in `src/services/managerService.js`.

## 6) Full Manager Backend SQL

Run this file once in Supabase SQL editor:

- `backend/sql/manager_backend_full.sql`

If you already have existing tables and want a non-destructive one-shot patch, run:

- `backend/sql/manager_backend_patch_existing.sql`

This script creates/aligns:
- `companies`
- `users` (custom app auth compatible)
- `approval_rules`
- `expenses`

And includes seed data for admin/manager/employee plus sample expenses.

## 7) Manager Endpoints (Protected)

Base URL: `http://localhost:8081/api/manager`

- `GET /overview`
- `GET /expenses`
- `GET /expenses/:expenseId`
- `PATCH /expenses/:expenseId/status`
- `POST /expenses/bulk-status`
- `POST /expenses/escalate-overdue`
- `GET /team-summary`
- `GET /rules`
