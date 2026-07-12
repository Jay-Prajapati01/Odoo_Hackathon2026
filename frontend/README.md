# AssetFlow ERP — Frontend Web Client

This is the React/Vite web application client for AssetFlow ERP, an Enterprise Asset & Resource Management system.

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The application runs on `http://localhost:5173/` by default. Requests to `/api` are automatically proxied to the backend server (on `http://localhost:5000/`).
