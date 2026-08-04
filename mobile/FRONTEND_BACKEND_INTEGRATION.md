# Handoff Frontend: Integrasi Backend Laravel TiKum

Dokumen ini merangkum kontrak frontend setelah migrasi TiKum dari Supabase ke backend Laravel. Semua endpoint, event, env, dan file di bawah diambil dari source aktual.

## 1. Ringkasan migrasi

- React Native + Expo tetap menjadi frontend.
- Supabase Auth diganti Laravel Sanctum.
- Supabase Database diganti Laravel REST API + PostgreSQL.
- Supabase Realtime diganti Laravel Reverb.
- Supabase Storage diganti Laravel Storage.
- Redis dipakai untuk cache, queue, dan kebutuhan backend.
- Backend dijalankan lewat Docker Compose.

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

## 2. Status migrasi

Fitur sudah pindah ke Laravel:

- Register, login, logout, restore session
- Forgot/reset password
- Profile
- Avatar
- Room
- Room member
- Trip
- Tour session
- Foreground/background location
- Realtime location
- Room close realtime
- SOS trigger/resolve
- History

Supabase dependency, client, environment variable, query, realtime, auth, dan storage sudah dihapus dari mobile. Search source mobile untuk `supabase` menghasilkan 0 hasil saat dokumen ini dibuat.

## 3. Struktur frontend penting

| File | Fungsi |
|---|---|
| `mobile/src/api/client.js` | API client terpusat. Ambil `EXPO_PUBLIC_API_URL`, pasang Bearer token dari Secure Store, handle JSON/FormData, hapus token saat 401, lempar `ApiError`. Saat ini masih ada log debug sementara `[API DEBUG]`. |
| `mobile/src/api/auth.api.js` | Wrapper register, login, logout, forgot password, reset password, get current user. Simpan/hapus token. |
| `mobile/src/api/profile.api.js` | GET/PUT profile dan upload avatar multipart. |
| `mobile/src/api/rooms.api.js` | Active room, create/join/leave/close room, detail room, members. |
| `mobile/src/api/trips.api.js` | Detail trip room. |
| `mobile/src/api/locations.api.js` | GET/POST current location per tour session. |
| `mobile/src/api/sos.api.js` | Trigger dan resolve SOS. |
| `mobile/src/api/history.api.js` | List/detail history trip, termasuk query pagination/filter. |
| `mobile/src/realtime/echo.js` | Factory Laravel Echo + Pusher React Native untuk Reverb private channel. Auth Reverb memakai Bearer token ke `/api/broadcasting/auth`. |
| `mobile/src/storage/tokenStorage.js` | Token Sanctum di `expo-secure-store`, key `tikum_api_token`. |
| `mobile/src/contexts/AuthContext.js` | Restore session lewat `/me`, expose `user`, `session`, `loading`, `login`, `register`, `logout`, `refreshUser`. |
| `mobile/src/services/backgroundLocation.js` | Expo TaskManager background location. Simpan `tourSessionId` di AsyncStorage key `tikum_active_tour_session_id`, kirim update ke Laravel Location API. |

Aturan: request API baru wajib dibuat di `src/api`. Jangan tulis `fetch` langsung tersebar di screen, kecuali file infrastruktur seperti realtime authorizer.

## 4. Environment frontend

Variable aktual yang dipakai mobile:

```env
EXPO_PUBLIC_API_URL=http://IP_LAPTOP:8000/api
EXPO_PUBLIC_REVERB_HOST=IP_LAPTOP
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

Contoh perangkat fisik:

```env
EXPO_PUBLIC_API_URL=http://IP_LAPTOP:8000/api
EXPO_PUBLIC_REVERB_HOST=IP_LAPTOP
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

Contoh Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_REVERB_HOST=10.0.2.2
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key
```

`mobile/app.config.js` mengekspos env ke `extra.apiUrl`, `extra.reverbHost`, `extra.reverbPort`, `extra.reverbScheme`, `extra.reverbAppKey`, dan `extra.resetPasswordUrl = 'tikum://reset-password'`.

Setelah `.env` berubah, restart Expo dengan cache clear:

```bash
npx expo start -c
```

Jangan tampilkan atau commit secret production. Tidak ada `mobile/.env.example` saat dokumen ini dibuat.

## 5. Environment database backend

Konfigurasi Laravel dari `backend/.env.example`:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=tikum
DB_USERNAME=tikum
DB_PASSWORD=secret
```

Catatan:

- `postgres` adalah nama service Docker.
- Laravel tidak memakai PostgreSQL lokal Windows.
- Dari dalam Docker, PostgreSQL tetap memakai port `5432`.
- Dari Windows/VS Code, PostgreSQL Docker diakses lewat:
  - Host: `127.0.0.1`
  - Port: `5433`
  - Database: `tikum`
  - Username: `tikum`
  - Password: `secret`
  - SSL: off
- Port host `5433` dipakai karena `5432` dipakai PostgreSQL Windows lokal.
- Frontend tidak perlu tahu konfigurasi database.

## 6. Cara menjalankan project

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

Mobile:

```bash
cd mobile
npm install
npx expo start -c
```

Log:

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f reverb
docker compose logs -f queue
```

## 7. Authentication

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

- Token tidak disimpan di AsyncStorage.
- `client.js` memasang header `Authorization: Bearer <token>` otomatis.
- Response 401 menghapus token lokal.
- Frontend tidak perlu dan tidak boleh mengirim `user_id` sebagai identitas.

### Endpoint auth

#### `POST /api/register`

Auth: public.

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "Nama User",
  "vehicle_name": "Vario 160",
  "device_name": "expo-mobile"
}
```

Validasi: `email` unique, `password` min 6, `display_name` required, `vehicle_name` required.

Response 201:

```json
{
  "message": "Registration successful",
  "token": "SANCTUM_TOKEN",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {}
  }
}
```

Error umum: 422 validation.

#### `POST /api/login`

Auth: public.

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "device_name": "expo-mobile"
}
```

Response 200: sama seperti register, `message = Login successful`.

Error umum: 401 bila email/password salah, 422 validation.

#### `POST /api/logout`

Auth: Bearer token.

Response:

```json
{ "message": "Logout successful" }
```

Frontend tetap menghapus token lokal walau request gagal.

#### `GET /api/me`

Auth: Bearer token.

Response:

```json
{ "user": { "id": "uuid", "email": "user@example.com", "profile": {} } }
```

Dipakai AuthContext untuk restore session.

#### `POST /api/forgot-password`

Auth: public.

Request:

```json
{ "email": "user@example.com" }
```

Response selalu generic agar tidak bocorkan email terdaftar:

```json
{ "message": "Jika email terdaftar, link reset password akan dikirim." }
```

#### `POST /api/reset-password`

Auth: public.

Request:

```json
{
  "email": "user@example.com",
  "token": "reset-token",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

Validasi: password min 8 dan confirmed.

Response:

```json
{ "message": "Password berhasil direset." }
```

Setelah reset sukses, backend menghapus semua Sanctum token user. Frontend juga menghapus token lokal.

## 8. Profile dan avatar

### `GET /api/profile`

Auth: Bearer token.

Response:

```json
{
  "profile": {
    "id": "uuid",
    "display_name": "Nama User",
    "vehicle_name": "Vario 160",
    "phone_number": "08123456789",
    "bio": "Bio",
    "avatar_path": "avatars/user-id/file.png",
    "avatar_url": "http://host/storage/avatars/user-id/file.png"
  }
}
```

### `PUT /api/profile`

Auth: Bearer token.

Request JSON:

```json
{
  "display_name": "Nama Baru",
  "vehicle_name": "ADV 160",
  "phone_number": "08123456789",
  "bio": "Touring weekend"
}
```

Validasi: `display_name` dan `vehicle_name` required, `phone_number` max 30, `bio` max 1000.

Response:

```json
{
  "message": "Profile updated successfully",
  "profile": {}
}
```

### `POST /api/profile/avatar`

Auth: Bearer token.

Request: multipart `FormData` dengan field `avatar`.

Validasi: image `jpg,jpeg,png,webp`, max 2048 KB.

Response:

```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "http://host/storage/avatars/user-id/file.png",
  "profile": {}
}
```

Catatan frontend:

- Jangan simpan URI lokal `file://` sebagai avatar permanen.
- `display_name` dan avatar disimpan terpisah, tidak ada format lama `Nama||UrlAvatar`.
- Setelah update profile/avatar, `ProfileScreen` memanggil `refreshUser()`.

## 9. Room, member, trip, dan session

Endpoint semua memakai Bearer token.

### `GET /api/rooms/active`

Mengambil maksimal 3 room aktif tempat user menjadi member aktif.

Response:

```json
{ "rooms": [] }
```

### `POST /api/rooms`

Backend membuat PIN 6 digit, host member, room trip, active tour session, dan session member dalam transaksi.

Request:

```json
{
  "origin_name": "Jakarta",
  "origin_latitude": -6.2,
  "origin_longitude": 106.8,
  "destination_name": "Bandung",
  "destination_latitude": -6.9,
  "destination_longitude": 107.6,
  "vehicle_type": "motorcycle",
  "use_tolls": null,
  "vehicle_count": 3,
  "route_distance_km": 150.5,
  "route_duration_min": 180
}
```

Validasi: koordinat valid, `vehicle_type` `motorcycle|car`, `vehicle_count` 1..99.

Response 201:

```json
{
  "message": "Room created successfully",
  "room": {},
  "trip": {},
  "session": {},
  "members": []
}
```

### `POST /api/rooms/join`

Request:

```json
{ "room_pin": "123456" }
```

Rule: room harus aktif, user belum menjadi member aktif.

Response:

```json
{
  "message": "Joined room successfully",
  "room": {},
  "trip": {},
  "session": {},
  "members": []
}
```

### `POST /api/rooms/{room}/leave`

Rule: hanya active member; host tidak bisa leave room aktif.

Response:

```json
{ "message": "Left room successfully" }
```

### `POST /api/rooms/{room}/close`

Rule: host only. Backend menutup room, menyelesaikan active session, lalu broadcast `.room.closed`.

Response:

```json
{
  "message": "Room closed successfully",
  "room": {}
}
```

### `GET /api/rooms/{room}`

Rule: active room member only.

Response:

```json
{ "room": {} }
```

### `GET /api/rooms/{room}/members`

Rule: active room member only.

Response:

```json
{ "members": [] }
```

### `GET /api/rooms/{room}/trip`

Rule: active room member only.

Response:

```json
{ "trip": {} }
```

Catatan frontend:

- PIN dibuat backend.
- Host/user ditentukan dari Sanctum token.
- Jangan kirim `user_id` dari frontend.
- Response `room` dan `session.id` menjadi dasar masuk `MapScreen` lewat `roomId` dan `tourSessionId`.
- `room_trips.vehicle_count` di database normal, bukan encoded. `HomeScreen` masih encode sementara untuk kompatibilitas UI Map lama.

## 10. Location API

### `GET /api/tour-sessions/{session}/locations/current`

Auth: Bearer token. Rule: active session member only.

Response:

```json
{
  "locations": [
    {
      "id": "uuid",
      "tour_session_id": "uuid",
      "user_id": "uuid",
      "latitude": -6.2,
      "longitude": 106.8,
      "heading": 90,
      "speed": 12.5,
      "accuracy": 8,
      "recorded_at": "2026-08-04T00:00:00.000000Z",
      "received_at": "2026-08-04T00:00:01.000000Z",
      "is_stale": false,
      "user": { "id": "uuid", "email": "user@example.com", "profile": {} }
    }
  ]
}
```

### `POST /api/tour-sessions/{session}/locations/current`

Auth: Bearer token. Rule: active session member only.

Request:

```json
{
  "latitude": -6.2,
  "longitude": 106.8,
  "heading": 90,
  "speed": 12.5,
  "accuracy": 8,
  "recorded_at": "2026-08-04T00:00:00.000Z"
}
```

Backend:

- Upsert ke `current_locations` berdasarkan `tour_session_id + user_id`.
- Simpan `location_histories` selektif: pertama kali, jarak >= 50m, atau waktu >= 60s.
- Skip history jika `accuracy > 100`.
- Broadcast `.member.location.updated` setelah DB save.

Frontend:

- Foreground dan background location memakai endpoint sama.
- `sessionId` wajib dari response backend, bukan dibuat manual.
- Jangan kirim `user_id`.
- Tangani 403: bukan member aktif.
- Tangani 422: session tidak aktif.

## 11. Realtime Laravel Reverb

Channel private aktual:

```text
private-tour-session.{sessionId}
```

Di Echo, subscribe dengan:

```js
echo.private(`tour-session.${sessionId}`)
```

Channel authorization:

- Endpoint auth: `POST /api/broadcasting/auth`.
- Auth: Bearer token.
- Body dari Echo: `socket_id`, `channel_name`.
- Backend hanya mengizinkan user yang menjadi active member dari active `tour_sessions`.

Flow realtime:

```text
REST API menyimpan data
→ Laravel broadcast event
→ Reverb
→ Echo menerima event
→ state/marker UI diperbarui
```

### Event `.member.location.updated`

Trigger backend: `MemberLocationUpdated`, setelah `POST /locations/current` berhasil.

Payload:

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "display_name": "Nama User",
  "avatar_url": "http://host/storage/avatar.png",
  "latitude": -6.2,
  "longitude": 106.8,
  "heading": 90,
  "speed": 12.5,
  "accuracy": 8,
  "recorded_at": "ISO string",
  "received_at": "ISO string",
  "is_stale": false
}
```

Efek frontend: `MapScreen` ignore self, update marker member, cache profile/avatar.

### Event `.room.closed`

Trigger backend: `RoomClosed`, setelah host close room dan DB transaction sukses.

Payload:

```json
{
  "room_id": "uuid",
  "session_id": "uuid",
  "closed_by_user_id": "uuid",
  "closed_at": "ISO string",
  "session_status": "finished"
}
```

Efek frontend: dialog room ditutup, stop foreground/background location, stop listeners, leave channel, disconnect Echo, clear markers, navigate Home.

### Event `.sos.alert.triggered`

Trigger backend: `SosAlertTriggered`, setelah SOS tersimpan.

Payload:

```json
{
  "session_id": "uuid",
  "sos_alert_id": "uuid",
  "user_id": "uuid",
  "display_name": "Nama User",
  "avatar_url": "http://host/storage/avatar.png",
  "message": "Butuh bantuan darurat",
  "latitude": -6.2,
  "longitude": 106.8,
  "triggered_at": "ISO string"
}
```

Efek frontend: tandai user SOS, update profile cache, haptic error, toast darurat.

### Event `.sos.alert.resolved`

Trigger backend: `SosAlertResolved`, setelah SOS resolved.

Payload:

```json
{
  "session_id": "uuid",
  "sos_alert_id": "uuid",
  "user_id": "uuid",
  "status": "resolved",
  "resolved_by_user_id": "uuid",
  "resolved_at": "ISO string"
}
```

Efek frontend: hapus tanda SOS user; jika user sendiri, reset state tombol SOS.

Cleanup listener di `MapScreen` dilakukan saat:

- screen unmount;
- leave room;
- room closed;
- session selesai;
- logout/navigasi keluar lewat unmount.

`MapScreen` juga bind Pusher `connected` untuk resync lokasi via REST `GET /locations/current`, dan menampilkan warning toast saat `unavailable` atau `error`.

## 12. SOS

### `POST /api/tour-sessions/{session}/sos`

Auth: Bearer token. Rule: active session member only.

Request:

```json
{
  "message": "Butuh bantuan darurat",
  "latitude": -6.2,
  "longitude": 106.8
}
```

Response 201:

```json
{
  "message": "SOS triggered successfully",
  "sos_alert": {}
}
```

Rule backend:

- Satu SOS aktif per user per session.
- `user_id` dari token.
- Koordinat optional.
- Backend source of truth.
- Broadcast `.sos.alert.triggered` setelah DB save.

### `POST /api/tour-sessions/{session}/sos/{sosAlert}/resolve`

Auth: Bearer token.

Rule:

- Active session member.
- SOS harus milik session tersebut.
- Hanya sender atau host yang bisa resolve.
- SOS harus masih active.

Response:

```json
{
  "message": "SOS resolved successfully",
  "sos_alert": {}
}
```

Frontend harus mengikuti response backend dan event Reverb, bukan state lokal saja.

## 13. History

### `GET /api/history/trips`

Auth: Bearer token.

Query optional:

```text
role=host|member|all
per_page=10
page=1
```

Response:

```json
{
  "trips": [
    {
      "session_id": "uuid",
      "room_id": "uuid",
      "room_pin": "123456",
      "status": "finished",
      "origin": { "name": "Jakarta", "latitude": -6.2, "longitude": 106.8 },
      "destination": { "name": "Bandung", "latitude": -6.9, "longitude": 107.6 },
      "vehicle_type": "motorcycle",
      "use_tolls": null,
      "vehicle_count": 3,
      "started_at": "ISO string",
      "finished_at": "ISO string",
      "duration_seconds": 3600,
      "member_count": 2,
      "user_role": "member"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 1,
    "last_page": 1,
    "has_more": false
  }
}
```

### `GET /api/history/trips/{session}`

Auth: Bearer token. Rule: user pernah ikut session, dan session status `finished` atau `cancelled`.

Response:

```json
{
  "trip": {
    "session": {},
    "room": {},
    "trip": {},
    "members": [],
    "member_count": 2
  }
}
```

Catatan:

- Host dan member dapat melihat session yang pernah diikuti.
- Session aktif tidak masuk history.
- `vehicle_count` normal, bukan encoded value lama.

## 14. Forgot/reset password

Deep link:

```text
tikum://reset-password?token=...&email=...
```

Flow:

```text
ForgotPasswordModal
→ Laravel /forgot-password
→ reset link
→ ResetPasswordScreen
→ Laravel /reset-password
→ token lama dicabut
→ kembali ke login
```

Development mail:

- `backend/.env.example` memakai `MAIL_MAILER=log`.
- Link reset akan masuk log Laravel bila SMTP belum dikonfigurasi.
- `AppServiceProvider` membuat URL reset dengan scheme `tikum://reset-password`.

## 15. API reference

| Method | Endpoint | Auth | Tujuan | File frontend |
|---|---|---|---|---|
| GET | `/api/health` | Public | Health check API | Manual/browser |
| POST | `/api/register` | Public | Register user + profile + token | `src/api/auth.api.js` |
| POST | `/api/login` | Public | Login dan buat token | `src/api/auth.api.js` |
| POST | `/api/forgot-password` | Public | Kirim reset link | `src/api/auth.api.js`, `ForgotPasswordModal.js` |
| POST | `/api/reset-password` | Public | Reset password dan cabut token lama | `src/api/auth.api.js`, `ResetPasswordScreen.js` |
| POST | `/api/broadcasting/auth` | Bearer | Auth private Reverb channel | `src/realtime/echo.js` |
| POST | `/api/logout` | Bearer | Hapus current token | `src/api/auth.api.js` |
| GET | `/api/me` | Bearer | Restore/current user | `src/api/auth.api.js`, `AuthContext.js` |
| GET | `/api/profile` | Bearer | Ambil profile sendiri | `src/api/profile.api.js` |
| PUT | `/api/profile` | Bearer | Update profile sendiri | `src/api/profile.api.js` |
| POST | `/api/profile/avatar` | Bearer | Upload avatar | `src/api/profile.api.js` |
| GET | `/api/rooms/active` | Bearer | List room aktif user | `src/api/rooms.api.js` |
| POST | `/api/rooms` | Bearer | Buat room/trip/session | `src/api/rooms.api.js` |
| POST | `/api/rooms/join` | Bearer | Join room by PIN | `src/api/rooms.api.js` |
| POST | `/api/rooms/{room}/leave` | Bearer | Leave room | `src/api/rooms.api.js` |
| POST | `/api/rooms/{room}/close` | Bearer | Host close room | `src/api/rooms.api.js` |
| GET | `/api/rooms/{room}` | Bearer | Detail room | `src/api/rooms.api.js` |
| GET | `/api/rooms/{room}/members` | Bearer | Daftar member room | `src/api/rooms.api.js` |
| GET | `/api/rooms/{room}/trip` | Bearer | Detail trip room | `src/api/trips.api.js` |
| GET | `/api/tour-sessions/{session}/locations/current` | Bearer | Current locations session | `src/api/locations.api.js` |
| POST | `/api/tour-sessions/{session}/locations/current` | Bearer | Update lokasi sendiri | `src/api/locations.api.js`, `backgroundLocation.js`, `MapScreen.js` |
| POST | `/api/tour-sessions/{session}/sos` | Bearer | Trigger SOS | `src/api/sos.api.js` |
| POST | `/api/tour-sessions/{session}/sos/{sosAlert}/resolve` | Bearer | Resolve SOS | `src/api/sos.api.js` |
| GET | `/api/history/trips` | Bearer | List history | `src/api/history.api.js`, `HistoryModal.js` |
| GET | `/api/history/trips/{session}` | Bearer | Detail history | `src/api/history.api.js` |

## 16. Realtime reference

| Event | Channel | Trigger backend | Efek frontend |
|---|---|---|---|
| `.member.location.updated` | `private-tour-session.{sessionId}` | `LocationController@update` dispatch `MemberLocationUpdated` setelah DB save | Update marker member, cache display/avatar, ignore self |
| `.room.closed` | `private-tour-session.{sessionId}` | `RoomController@close` dispatch `RoomClosed` setelah room/session selesai | Dialog room closed, stop tracking, cleanup Echo, navigate Home |
| `.sos.alert.triggered` | `private-tour-session.{sessionId}` | `SosController@trigger` dispatch `SosAlertTriggered` setelah SOS tersimpan | Tandai user SOS, haptic, toast darurat |
| `.sos.alert.resolved` | `private-tour-session.{sessionId}` | `SosController@resolve` dispatch `SosAlertResolved` setelah SOS resolved | Hapus tanda SOS, reset tombol user sendiri bila perlu |

## 17. Error handling

Status umum:

- 401: token tidak valid, belum login, atau session kedaluwarsa. `client.js` menghapus token lokal.
- 403: user tidak punya akses, bukan member aktif, bukan host, atau bukan sender SOS.
- 404: resource tidak ditemukan, seperti room/SOS/session tidak sesuai.
- 422: validation atau business rule gagal, seperti duplicate room join, session tidak aktif, SOS aktif sudah ada.
- 500: server error.

Implementasi aktual `client.js` membaca response JSON, lalu memilih pesan error pertama dari `data.errors` atau `data.message`.

Contoh pola konsumsi error:

```js
try {
  await createRoom(payload);
} catch (error) {
  const message = error?.data?.message || error?.message;
  const errors = error?.data?.errors;
}
```

Catatan: karena `ApiError` menyimpan response di `error.data`, bukan `error.response`, adaptasi pola axios menjadi:

```js
error.data?.message
error.data?.errors
```

Jika memakai library lain nanti, samakan contract error agar screen tidak perlu berubah banyak.

## 18. Checklist integrasi frontend

Saat membuat fitur frontend baru:

1. Periksa endpoint backend.
2. Tambahkan fungsi di `src/api`.
3. Gunakan API client terpusat.
4. Jangan mengirim `user_id` manual.
5. Tambahkan loading/error/empty state.
6. Jika realtime, gunakan private channel.
7. Cleanup listener saat unmount/leave/logout/session selesai.
8. Update dokumentasi jika contract berubah.
9. Koordinasikan perubahan payload dengan backend.

## 19. Hal yang dilarang

- Jangan menambahkan kembali Supabase.
- Jangan query PostgreSQL langsung dari mobile.
- Jangan hardcode URL backend.
- Jangan menyimpan token di AsyncStorage.
- Jangan mengirim `user_id` sebagai identitas.
- Jangan membuat public channel untuk tour session.
- Jangan mengganti nama event sepihak.
- Jangan menulis request API langsung tersebar di screen.
- Jangan menghapus cleanup subscription.
- Jangan mengubah API contract tanpa koordinasi.

## 20. Troubleshooting

### `Network request failed`

Cek:

1. `EXPO_PUBLIC_API_URL` tidak ada spasi, contoh salah: `http:// 10.20...`.
2. HP dan laptop di jaringan yang sama.
3. `http://IP_LAPTOP:8000/api/health` bisa dibuka dari Safari/Chrome HP.
4. Firewall Windows membuka port 8000 dan 8080.
5. Restart Expo: `npx expo start -c`.

### API health bisa di laptop tetapi tidak di HP

- Jangan pakai `localhost` untuk perangkat fisik.
- Pakai IP Wi-Fi laptop: `http://IP_LAPTOP:8000/api`.
- Pastikan Docker nginx publish `0.0.0.0:8000`.

### IP laptop berubah

Update:

```env
EXPO_PUBLIC_API_URL=http://IP_BARU:8000/api
EXPO_PUBLIC_REVERB_HOST=IP_BARU
```

Lalu jalankan:

```bash
npx expo start -c
```

### Expo masih membaca `.env` lama

- Stop Metro.
- Jalankan `npx expo start -c`.
- Cek output `npx expo config --type public`.

### Android emulator tidak bisa memakai localhost

Pakai:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_REVERB_HOST=10.0.2.2
```

### Reverb tidak tersambung

Cek:

```bash
docker compose ps
docker compose logs -f reverb
```

Pastikan:

- `EXPO_PUBLIC_REVERB_HOST` sama dengan IP laptop untuk device fisik.
- `EXPO_PUBLIC_REVERB_PORT=8080`.
- `EXPO_PUBLIC_REVERB_APP_KEY=tikum-local-key` sesuai backend env.
- Token masih valid.
- User adalah active member session.

### PostgreSQL Docker tidak terlihat dari VS Code

Gunakan koneksi host Windows:

```text
Host: 127.0.0.1
Port: 5433
Database: tikum
Username: tikum
Password: secret
SSL: off
```

### Port 5432 bentrok dengan PostgreSQL Windows

Project Docker memakai host port `5433:5432`. Jangan ubah Laravel `DB_PORT`; Laravel dari container tetap memakai service `postgres:5432`.

### Token 401

- Token hilang/expired/invalid.
- `client.js` akan menghapus token Secure Store.
- User harus login ulang.
- Reset password juga mencabut token lama.

### Avatar URL tidak terbuka

Cek:

1. `php artisan storage:link` sudah dijalankan.
2. URL memakai host yang bisa diakses device.
3. File tersimpan di disk `public` path `avatars/{user_id}/...`.
4. Nginx/API berjalan di port 8000.

### Docker container unhealthy

Cek:

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis
```

Healthcheck penting:

- nginx: `GET /api/health`
- postgres: `pg_isready -U tikum -d tikum`
- redis: `redis-cli ping`

## 21. Pembagian tanggung jawab tim

Frontend:

- UI
- form
- state
- navigation
- device permission
- API integration
- token storage
- Reverb listener
- loading/error state
- cleanup subscription

Backend:

- authentication
- validation
- authorization
- database
- business rules
- file storage
- queue
- realtime event
- API contract

Wajib dikoordinasikan:

- endpoint
- request body
- response body
- status code
- event name
- event payload
- environment variable

## 22. Checklist setelah pull

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
- Expo membaca API/Reverb env lewat `npx expo config --type public`.
- Login berhasil.
- Reverb terhubung saat masuk `MapScreen`.
- Background location permission tetap diminta sesuai platform.
- Forgot/reset deep link `tikum://reset-password?token=...&email=...` membuka `ResetPasswordScreen`.
