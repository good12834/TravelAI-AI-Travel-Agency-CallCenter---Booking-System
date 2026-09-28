# TravelAI — Deployment Guide

## 1. Docker Compose (recommended)

```bash
docker-compose up --build -d
```

Services started:

| Service | Port | Notes |
|---|---|---|
| `frontend` (nginx) | **80** | Built React SPA + API/WebSocket reverse proxy |
| `backend` (gunicorn + eventlet) | 5000 | Runs `seed.py` automatically on boot |
| `mysql` 8.0 | 3306 | Persistent volume `mysql_data` |
| `redis` 7 | 6379 | Socket.IO message queue |

Health checks gate startup: backend waits for healthy `mysql` + `redis`.

Verify:
```bash
curl http://localhost:5000/api/health
curl http://localhost            # frontend
```

## 2. Environment Variables

Backend `.env` (see `.env.example`):

```env
FLASK_ENV=production
SECRET_KEY=<random-64-char-string>
JWT_SECRET_KEY=<random-64-char-string>
DATABASE_URL=mysql+pymysql://travelai:travelai_pass@mysql:3306/travelai
# DATABASE_URL=sqlite:///travelai.db   # zero-config fallback
REDIS_URL=redis://redis:6379/0
PORT=5000
```

Frontend build arg: `VITE_API_URL` (defaults to `http://localhost:5000`).

> ⚠️ Always change `SECRET_KEY` and `JWT_SECRET_KEY` in production.

## 3. Manual (non-Docker) Deployment

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt gunicorn eventlet
cp .env.example .env                              # edit secrets & DB URL
python seed.py                                    # load demo data
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 run:app
```
> Socket.IO requires exactly **1 worker** (or Redis-backed multi-worker setup).

### Frontend
```bash
cd frontend
npm install
npm run build        # Windows + '&' in path: node node_modules/vite/bin/vite.js build
# serve dist/ with nginx/caddy, proxying /api and /socket.io to the backend
```

## 4. Nginx Reverse Proxy

`frontend/nginx.conf` (also used in the Docker image) handles:
- SPA fallback: `try_files $uri $uri/ /index.html`
- `/api/` → `proxy_pass http://backend:5000`
- `/socket.io/` → WebSocket upgrade headers (`Upgrade`, `Connection "upgrade"`, HTTP/1.1)

## 5. Database Migration (SQLite → MySQL)

1. Create the MySQL database: `CREATE DATABASE travelai CHARACTER SET utf8mb4;`
2. Set `DATABASE_URL=mysql+pymysql://...` in `.env`
3. Run `python seed.py` (creates schema + demo data) — or use Flask-Migrate for an existing deployment:
   ```bash
   flask db init && flask db migrate -m "init" && flask db upgrade
   ```

## 6. Production Checklist

- [ ] Change `SECRET_KEY` / `JWT_SECRET_KEY` to strong random values
- [ ] Use MySQL (not SQLite) for concurrent writes
- [ ] Restrict Flask-CORS origins in `app/__init__.py` (currently `*` for dev)
- [ ] Serve over HTTPS (terminate TLS at nginx / load balancer)
- [ ] Set `FLASK_ENV=production` (disables debug mode in `run.py`)
- [ ] Configure real STT/TTS API keys if replacing browser Web Speech API
- [ ] Swap mock integrations (`app/integrations/`) for Twilio / WhatsApp Business API / Stripe
- [ ] Set up log aggregation & monitoring on `/api/health`
- [ ] Schedule `flask db backup` / MySQL dumps

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run build` fails with "Cannot find module .../vite/bin/vite.js" on Windows | Path contains `&`; run `node node_modules/vite/bin/vite.js build` or move the project to a plain path |
| Socket events not received | Ensure only 1 gunicorn worker, or configure Redis message queue |
| DB locked errors under load | Migrate SQLite → MySQL |
| JWT 401 after restart | Secrets changed between deploys; clear browser localStorage |
