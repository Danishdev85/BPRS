# BPRS — Business Private Revenue Simulation

**BPRS (Business Private Revenue Simulation)** is private software for e-commerce business owners. It keeps the complete record of a business in one place — products, orders, revenue and profit — with financial monitoring and a revenue simulator, so the owner always knows exactly where the business stands.

It works for **any kind of e-commerce**: electronics, fashion, grocery, cosmetics, digital goods — any product can be recorded.

## Features

- **Private login** — single-owner account, JWT-secured. Your business data stays yours.
- **Dashboard** — total revenue, gross profit, order count, average order value, last-30-days revenue, a 6-month revenue chart, top products, recent orders and a low-stock watch.
- **Products** — add, edit and delete products with category, SKU, selling price, cost price (margin is calculated automatically) and stock levels.
- **Orders** — full order management: add, edit/update, search and filter by status (pending, confirmed, shipped, delivered, cancelled), payment tracking (paid/unpaid), and an **optional picture upload with every order** (order screenshot, parcel photo, payment receipt).
- **Trash & restore** — deleted orders go to Trash first, can be **restored any time**, deleted forever on demand, and are auto-cleaned after 30 days.
- **Finance monitoring** — total revenue vs product cost vs gross profit, money still to collect, and a month-by-month breakdown table.
- **Revenue simulator** — project revenue and profit from expected orders per day, average order value, margin and growth.
- **Download order history** — one click exports the complete order history (with profit per order) as a CSV file.

## Design

Professional SaaS-grade interface in the class of Stripe / Linear dashboards: **Inter** typography with tabular numbers, a deep-violet sidebar, clean white cards, precise button hover and focus states, and clean SVG iconography — no emojis anywhere in the UI.

## Tech stack

- **Client:** React 19 + Vite (plain CSS design system, fully responsive)
- **Server:** Node.js + Express, JWT authentication, Multer image uploads
- **Database:** MySQL / MariaDB

## Run it locally

1. Create a MySQL database named `bprs` (the schema in `server/schema.sql` is also applied automatically on first boot).
2. Copy `server/.env.example` to `server/.env` and set your database credentials.
3. Server: `cd server && npm install && node index.js` (runs on port 4100)
4. Client: `cd client && npm install && npm run dev` (runs on port 5174)
5. Open **http://localhost:5174** and sign in.

**Default login** (change it in `server/.env`): username `admin`, password `bprs123`.

## Notes

- BPRS is private, single-user software. It runs locally and is not hosted publicly.
- Cancelled orders are excluded from revenue and profit figures.
- Order pictures are stored in `server/uploads/` and are never committed to this repository.
