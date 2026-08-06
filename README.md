# Tikum Backend

Repository ini khusus backend Laravel API untuk Tikum.

## Stack

- Laravel API
- PostgreSQL 17
- Redis 7
- Laravel Queue worker
- Laravel Reverb WebSocket server
- Nginx
- Docker Compose

## Struktur

```text
Tikum/
├── backend/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Konfigurasi `.env`

File environment backend berada di `backend/.env`.

Jika belum ada, buat dari contoh:

```bash
cp backend/.env.example backend/.env
```

Nilai Docker lokal utama:

```env
APP_NAME="Tikum API"
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=tikum
DB_USERNAME=tikum
DB_PASSWORD=secret

CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis
REDIS_PORT=6379

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=tikum-local
REVERB_APP_KEY=tikum-local-key
REVERB_APP_SECRET=tikum-local-secret
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http
```

## Menjalankan Docker

```bash
docker compose up -d --build
```

Cek container:

```bash
docker compose ps
```

Service lokal:

- API via Nginx: `http://localhost:8000`
- PostgreSQL host port: `5433`
- Redis host port: `6379`
- Reverb host port: `8080`

## Migration

```bash
docker compose exec app php artisan migrate
```

## Testing

```bash
docker compose exec app php artisan test
```

## API Health

```bash
curl http://localhost:8000/api/health
```

## PostgreSQL

Container PostgreSQL memakai volume Docker `tikum_postgres_data`. Jangan hapus volume ini jika ingin mempertahankan data lokal.

Akses dari DBeaver:

- Host: `127.0.0.1`
- Port: `5433`
- Database: `tikum`
- Username: `tikum`
- Password: `secret`

## Redis

Cek Redis dari container:

```bash
docker compose exec redis redis-cli ping
```

Output sehat:

```text
PONG
```

## Queue Worker

Queue worker berjalan di service `queue`:

```bash
docker compose ps queue
```

Log worker:

```bash
docker compose logs queue
```

## Reverb

Reverb berjalan di service `reverb` dan expose port `8080`:

```bash
docker compose ps reverb
```

Cek port lokal:

```bash
curl http://localhost:8080
```

## Catatan deployment

- `docker-compose.yml` tetap berada di root.
- Source backend tetap di `backend/`.
- Nginx config berada di `backend/docker/nginx/default.conf`.
- PostgreSQL memakai volume `tikum_postgres_data`.
- Tidak ada dependency di luar `backend/`.
