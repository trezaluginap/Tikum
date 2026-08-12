# TiKum (Titik Kumpul)

Aplikasi pelacakan lokasi real-time berbasis mobile untuk koordinasi rombongan konvoi, touring, atau road trip.

## Fitur MVP

1. Auth, reset password, profil, dan avatar melalui Laravel API.
2. Room PIN 6-digit, join/leave/close room, trip, dan history melalui Laravel API.
3. Foreground/background location ke Laravel API.
4. Realtime marker, room close, dan SOS melalui Laravel Reverb.
5. Route preview via Valhalla, search lokasi via Nominatim, weather via Open-Meteo.

## Setup Frontend

```bash
npm install
npx expo start -c
```

## Environment

Buat `.env` di folder `mobile/`:

```env
EXPO_PUBLIC_API_URL=http://IP_LAPTOP:8000/api
EXPO_PUBLIC_REVERB_HOST=IP_LAPTOP
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_REVERB_HOST=10.0.2.2
```

## Backend

Backend Laravel berada di `../backend`. Jalankan dari root monorepo:

```bash
docker compose up -d
```

API: `http://localhost:8000/api`
Reverb: `http://localhost:8080`

## Git Flow

- `main`: rilis produksi.
- `develop`: integrasi fitur.
- Feature branch: `feat/[nama-fitur]`, `fix/[nama-bug]`, `ui/[nama-layar]`.

TiKum App — Selesai Masalah di Jalan, Fokus Koordinasi Nyaman.
