FreeShare - Community Marketplace
A hyperlocal community marketplace where neighbors share items they no longer need.
Quick Start
bash# Install dependencies
npm install

# Start development (runs both API + frontend)
npm run dev

Frontend: http://localhost:5173
API: http://localhost:3000

Features
✅ User authentication (demo mode)
✅ Post items with categories & condition
✅ Location-based feed with filters
✅ Direct messaging between users
✅ Save/bookmark items
✅ Responsive design
Architecture
Component-Based React Frontend

Reusable UI components (Button, Avatar, Modal, ItemCard, etc.)
Context providers for auth and location
CSS Modules for scoped styling
Vite for fast development

Hono API Backend

RESTful endpoints
sql.js for SQLite (no native deps)
Session-based authentication

Project Structure
src/
├── components/     # Reusable UI (Button, Avatar, Modal, ItemCard, etc.)
├── pages/          # Page components (Feed, ItemDetail, PostItem)
├── context/        # Auth & Location contexts
├── lib/            # API client, DB, repositories
├── styles/         # Global CSS variables
├── types/          # TypeScript types
├── App.tsx         # Main app
├── main.tsx        # Entry point
└── server.ts       # API server

Design

Colors: Warm terracotta (#D4714A), sage (#A8BFA0), cream background
Typography: Fraunces (display), DM Sans (body)
Style: Warm minimalism with playful accents