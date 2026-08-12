# Ringkasan Integrasi Frontend-Backend TiKum

Dokumen ini merangkum integrasi mobile React Native + Expo dengan backend Laravel setelah migrasi dari Supabase.

## 1. Arsitektur singkat

```text
React Native + Expo
        ↓ REST API + Bearer Token
Laravel API
        ├── PostgreSQL
        ├── Redis
        ├── Queue Worker
        ├── Laravel Reverb
        └── Laravel Storage
```

Migrasi utama:

- Supabase Auth → Laravel Sanctum
- Supabase Database → Laravel REST API + PostgreSQL
- Supabase Realtime → Laravel Reverb
- Supabase Storage → Laravel Storage
- Backend dijalankan lewat Docker Compose

## 2. Stack dan tools yang harus disiapkan

### Frontend mobile

- Node.js + npm
- React Native
- Expo CLI lewat `npx expo`
- Expo Go atau emulator Android/iOS
- Android Studio untuk Android emulator
- Xcode untuk iOS simulator, khusus macOS
- `expo-secure-store` untuk token Sanctum
- `@react-native-async-storage/async-storage` untuk state non-secret seperti active tour session
- Laravel Echo + Pusher React Native client untuk Reverb

### Backend

- PHP/Laravel di container Docker
- Laravel Sanctum untuk authentication token
- Laravel Reverb untuk realtime event
- Laravel Queue Worker
- Laravel Storage public disk untuk avatar/file
- PostgreSQL sebagai database utama
- Redis untuk cache, queue, dan backend support
- Nginx sebagai web server/API gateway di Docker

### Tools development

- Docker Desktop
- Docker Compose
- Git
- VS Code atau editor lain
- PostgreSQL client opsional, contoh DBeaver/TablePlus/VS Code extension
- Browser untuk cek health endpoint
- Device fisik dalam jaringan Wi-Fi yang sama, jika test di HP

## 3. Environment frontend

Buat `.env` di folder `mobile`.

### Perangkat fisik

```env
EXPO_PUBLIC_API_URL=http://IP_LAPTOP:8000/api
EXPO_PUBLIC_REVERB_HOST=IP_LAPTOP
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

### Android emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_REVERB_HOST=10.0.2.2
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

Setelah `.env` berubah, restart Expo:

```bash
npx expo start -c
```

Jangan commit secret production.

## 4. Environment database backend

Konfigurasi Laravel dari `backend/.env.example`:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=tikum
DB_USERNAME=tikum
DB_PASSWORD=secret
```

Catatan penting:

- `postgres` adalah nama service Docker.
- Laravel dari container memakai `postgres:5432`.
- Dari Windows/VS Code, database Docker diakses lewat:

```text
Host: 127.0.0.1
Port: 5433
Database: tikum
Username: tikum
Password: secret
SSL: off
```

Frontend tidak perlu tahu konfigurasi database.

## 5. Cara menjalankan project

Dari root repo:

```bash
docker compose up -d --build
docker compose ps
docker compose exec app php artisan migrate
```

Health check:

```text
http://localhost:8000/api/health
```

Jalankan mobile:

```bash
cd mobile
npm install
npx expo start -c
```

Log backend:

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f reverb
docker compose logs -f queue
```

## 6. File frontend penting

| File | Fungsi |
|---|---|
| `mobile/src/api/client.js` | API client terpusat, Bearer token, JSON/FormData, 401 cleanup, `ApiError`. |
| `mobile/src/api/auth.api.js` | Register, login, logout, forgot/reset password, current user. |
| `mobile/src/api/profile.api.js` | Profile dan upload avatar. |
| `mobile/src/api/rooms.api.js` | Active room, create, join, leave, close, detail, members. |
| `mobile/src/api/trips.api.js` | Detail trip room. |
| `mobile/src/api/locations.api.js` | Current location GET/POST per tour session. |
| `mobile/src/api/sos.api.js` | Trigger dan resolve SOS. |
| `mobile/src/api/history.api.js` | List/detail history trip. |
| `mobile/src/realtime/echo.js` | Laravel Echo + Reverb private channel. |
| `mobile/src/storage/tokenStorage.js` | Token Sanctum di Secure Store, key `tikum_api_token`. |
| `mobile/src/contexts/AuthContext.js` | Restore session, auth state, login/register/logout. |
| `mobile/src/services/backgroundLocation.js` | Background location dan active tour session storage. |

Aturan: request API baru wajib dibuat di `src/api`. Jangan sebar `fetch` langsung di screen.

## 7. Fitur yang sudah pindah ke Laravel

- Register, login, logout, restore session
- Forgot/reset password
- Profile dan avatar
- Room dan room member
- Trip dan tour session
- Foreground/background location
- Realtime location
- Room close realtime
- SOS trigger/resolve
- History

Supabase sudah tidak dipakai di mobile.

## 8. Authentication

Flow:

```text
Login/Register
→ auth.api.js
→ Laravel API
→ Sanctum token
→ Expo Secure Store
→ AuthContext
→ request berikutnya memakai Bearer token
```

Catatan:

- Token disimpan di Secure Store, bukan AsyncStorage.
- `client.js` otomatis memasang `Authorization: Bearer <token>`.
- Response 401 menghapus token lokal.
- Frontend tidak boleh mengirim `user_id` sebagai identitas.

Endpoint auth utama:

| Method | Endpoint | Auth | Tujuan |
|---|---|---|---|
| POST | `/api/register` | Public | Register user + token |
| POST | `/api/login` | Public | Login + token |
| POST | `/api/logout` | Bearer | Hapus token aktif |
| GET | `/api/me` | Bearer | Restore/current user |
| POST | `/api/forgot-password` | Public | Kirim reset link |
| POST | `/api/reset-password` | Public | Reset password |

## 9. API utama

| Area | Endpoint utama | File frontend |
|---|---|---|
| Health | `GET /api/health` | Manual/browser |
| Profile | `GET/PUT /api/profile`, `POST /api/profile/avatar` | `profile.api.js` |
| Room | `/api/rooms/*` | `rooms.api.js` |
| Trip | `GET /api/rooms/{room}/trip` | `trips.api.js` |
| Location | `/api/tour-sessions/{session}/locations/current` | `locations.api.js` |
| SOS | `/api/tour-sessions/{session}/sos*` | `sos.api.js` |
| History | `/api/history/trips*` | `history.api.js` |
| Reverb auth | `POST /api/broadcasting/auth` | `echo.js` |

## 10. Realtime Reverb

Private channel:

```text
private-tour-session.{sessionId}
```

Event:

| Event | Efek frontend |
|---|---|
| `.member.location.updated` | Update marker member. |
| `.room.closed` | Stop tracking, cleanup Echo, navigate Home. |
| `.sos.alert.triggered` | Tandai user SOS, haptic/toast. |
| `.sos.alert.resolved` | Hapus tanda SOS. |

Auth Reverb memakai Bearer token ke `/api/broadcasting/auth`.

## 11. Error handling

Status umum:

- 401: token tidak valid/session kedaluwarsa, token lokal dihapus.
- 403: user tidak punya akses.
- 404: resource tidak ditemukan.
- 422: validation/business rule gagal.
- 500: server error.

Pola konsumsi error:

```js
try {
  await createRoom(payload);
} catch (error) {
  const message = error?.data?.message || error?.message;
  const errors = error?.data?.errors;
}
```

`ApiError` menyimpan response di `error.data`, bukan `error.response`.

## 12. Checklist integrasi fitur baru

1. Cek endpoint backend.
2. Tambahkan fungsi di `src/api`.
3. Gunakan API client terpusat.
4. Jangan kirim `user_id` manual.
5. Tambahkan loading/error/empty state.
6. Jika realtime, gunakan private channel.
7. Cleanup listener saat unmount/leave/logout/session selesai.
8. Update dokumentasi jika contract berubah.
9. Koordinasikan payload dengan backend.

## 13. Hal yang dilarang

- Menambahkan kembali Supabase.
- Query PostgreSQL langsung dari mobile.
- Hardcode URL backend.
- Simpan token di AsyncStorage.
- Kirim `user_id` sebagai identitas.
- Pakai public channel untuk tour session.
- Ubah nama event sepihak.
- Sebar request API langsung di screen.
- Hapus cleanup subscription.
- Ubah API contract tanpa koordinasi.

## 14. Troubleshooting cepat

### `Network request failed`

Cek:

1. `EXPO_PUBLIC_API_URL` tidak ada spasi.
2. HP dan laptop satu jaringan.
3. `http://IP_LAPTOP:8000/api/health` bisa dibuka dari browser HP.
4. Firewall Windows membuka port 8000 dan 8080.
5. Restart Expo dengan `npx expo start -c`.

### API jalan di laptop tapi gagal di HP

- Jangan pakai `localhost` untuk device fisik.
- Pakai IP Wi-Fi laptop.
- Pastikan Docker nginx publish `0.0.0.0:8000`.

### Android emulator gagal akses backend

Pakai `10.0.2.2`, bukan `localhost`.

### Reverb tidak tersambung

Cek:

```bash
docker compose ps
docker compose logs -f reverb
```

Pastikan host, port, app key, token, dan membership session benar.

### PostgreSQL Docker tidak terlihat dari VS Code

Gunakan `127.0.0.1:5433`, bukan `postgres:5432`.

### Token 401

Login ulang. `client.js` akan menghapus token Secure Store.

### Avatar URL tidak terbuka

Cek `php artisan storage:link`, host URL device, path storage, dan nginx/API port 8000.

## 15. Pembagian tanggung jawab

Frontend:

- UI, form, state, navigation
- Permission device
- API integration
- Token storage
- Reverb listener
- Loading/error state
- Cleanup subscription

Backend:

- Authentication
- Validation dan authorization
- Database
- Business rules
- File storage
- Queue
- Realtime event
- API contract

Wajib koordinasi untuk endpoint, request body, response body, status code, event name, event payload, dan environment variable.

## 16. Checklist setelah pull

Dari root:

```bash
git pull
docker compose up -d
docker compose exec app php artisan migrate
```

Mobile:

```bash
cd mobile
npm install
npx expo start -c
```

Verifikasi:

- `GET /api/health` berhasil.
- Expo membaca env lewat `npx expo config --type public`.
- Login berhasil.
- Reverb terhubung saat masuk `MapScreen`.
- Background location permission muncul sesuai platform.
- Deep link reset password `tikum://reset-password?token=...&email=...` membuka `ResetPasswordScreen`.
