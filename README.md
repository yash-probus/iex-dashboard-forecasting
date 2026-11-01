# IEX Forecasting & Analytics Platform

Comprehensive power forecasting and market intelligence platform for the Indian Energy Exchange (IEX).

## Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, TypeScript, Material-UI, TanStack Query.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, Python (LightGBM, scikit-learn).

## Core Modules

- **IEX Market Analytics**: Day-Ahead Market (DAM), Green Day-Ahead Market (GDAM), Real-Time Market (RTM), Renewable Energy Certificates (REC), and UP Market analytics.
- **Forecasting**: Price forecasting (DAM, RTM Day Ahead, RTM Nowcast, GDAM), Consumer Demand forecasting, All-India Grid Demand forecasting, and NPP Generation forecasting.
- **Demand & Generation Telemetry**: All-India demand (NPP), Generation telemetry, State-wise demand, Weather telemetry, and Holiday calendar.
- **Market Operations**: MCP Analyst, Market Trends, and Bidding Strategy.
- **Resource Center**: State tariffs, ISTS losses, CTU charges, Discom structures, State charges, and IEX fees.
- **Trader Performance**: Performance tracking and daily desk metrics.
- **Governance**: User Management (RBAC) and Pipeline API Logs.

## Getting Started

### Prerequisites

- Node.js (v20+)
- PostgreSQL (v15+)
- Redis (v7+)
- Python 3.10+ (for ML forecasting pipelines)

### Local Development

1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Configure DATABASE_URL and PORT in .env
   npm install
   npm run dev
   ```
   Backend runs by default on `http://localhost:5001`.

2. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   Frontend runs by default on `http://localhost:5175`.

