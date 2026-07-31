# TiKum (Titik Kumpul) 📍

Aplikasi pelacakan lokasi *real-time* berbasis mobile (Android & iOS) yang dirancang khusus untuk mempermudah koordinasi rombongan konvoi, *touring*, atau *road trip*. Proyek ini meminimalisir risiko anggota terpisah menggunakan komunikasi koordinat instan, visualisasi navigasi 3D, urutan radar rombongan, dan sinyal darurat (SOS) terpusat.

---

## 🎯 Goals & Tujuan Aplikasi
* **Koordinasi Instan:** Menghubungkan rombongan convoy melalui PIN kamar 6-digit tanpa proses konfigurasi rumit.
* **Safety First:** Fitur SOS instan jika ada kendala di perjalanan (ban bocor, mesin mati, dll) yang langsung broadcast alarm ke semua anggota.
* **Radar Rombongan:** Mengetahui posisi relatif convoy secara langsung (siapa di depan, siapa di belakang kita, dan berapa jaraknya) untuk menjaga barisan berkendara tetap rapat.
* **Navigasi Terarah:** Mode mengemudi 3D (follow-heading) dilengkapi Turn-by-Turn guidance agar tidak tersesat meskipun berkendara dalam rombongan besar.

---

## 🚀 Fitur MVP & Phase 1 (Sudah Terimplementasi)
1. **Sistem Auth & Profil:** Registrasi callsign (nama tampil) + spesifikasi kendaraan, login, dan integrasi update foto profil ke cloud storage.
2. **Room Management:** Membuat convoy room baru dengan auto-generated 6-digit PIN, serta bergabung ke room aktif teman.
3. **Peta & Rute Real-time:** preview rute konvoi (asal & tujuan) via Valhalla routing engine (motor, mobil tol, mobil non-tol).
4. **Navigasi Mode 3D:** Kamera mengemudi dinamis (pitch 55°), mengikuti GPS secara real-time, dan memutar peta otomatis mengikuti sensor arah hadap (`heading`).
5. **Turn-by-Turn (TBT) Guidance:** Banner penunjuk arah manuver jalan di atas peta berdasarkan rute aktif.
6. **Convoy Radar HUD:** Mendeteksi posisi relatif dan jarak antar anggota rombongan di jalur konvoi (tahu siapa di depan/belakangmu).
7. **Sinyal SOS Darurat:** Tombol SOS sekali klik yang mengirim alert alarm darurat secara instan via WebSockets ke HP semua anggota convoy dengan visual marker berkedip ⚠️.
8. **Background Location Service:** Lokasi tetap ter-update ke server meskipun aplikasi di-minimize atau HP terkunci (menggunakan `expo-task-manager`).
9. **Premium UI/UX:** Tema warna gelap (Techy Minimalist Slate/Indigo), notifikasi dialog kustom (glassmorphic style), dan feedback haptic/getaran dinamis.

---

## 🛠️ Instalasi & Setup Lokal (Frontend)

1. **Clone repositori:**
   ```bash
   git clone https://github.com/[username-lu]/TiKum-App.git
   cd TiKum-App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Environment Variables:**
   Buat file `.env` di root folder proyek (sejajar dengan `package.json`) dan isi dengan kunci Supabase proyek kamu:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-PANJANG]
   ```
   > **⚠️ PERINGATAN:** File `.env` sudah masuk di `.gitignore` dan jangan pernah dicommit ke GitHub.

4. **Rebuild Native Config (Wajib karena ada background service):**
   ```bash
   npx expo prebuild
   ```

5. **Jalankan aplikasi:**
   ```bash
   npx expo start -c
   ```

---

## 🗄️ Spesifikasi Database & Setup Backend (Supabase)
*Panduan untuk Backend Developer (Collaborator) untuk inisialisasi schema database PostgreSQL di Supabase.*

### 1. Struktur Tabel SQL

Buka **Supabase SQL Editor** dan jalankan query berikut untuk membuat struktur database TiKum:

```sql
-- TABEL 1: PROFILES (Koneksi ke Auth Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL, -- Format penyimpanan: "Nama Tampil||UrlFoto"
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 2: ROOMS (Sesi Konvoi)
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_pin VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 3: ROOM_TRIPS (Detail rute asal, tujuan, dan jenis kendaraan)
CREATE TABLE public.room_trips (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE PRIMARY KEY,
  origin_latitude NUMERIC NOT NULL,
  origin_longitude NUMERIC NOT NULL,
  destination_latitude NUMERIC NOT NULL,
  destination_longitude NUMERIC NOT NULL,
  vehicle_count INTEGER NOT NULL, -- Format: modeCode * 1000 + jumlah_kendaraan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 4: LOCATIONS (Pelacakan koordinat real-time anggota rombongan)
CREATE TABLE public.locations (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. Setup Supabase Storage (Bucket Avatars)
Aplikasi TiKum menyimpan avatar profil di storage. Pastikan untuk membuat **Storage Bucket** kustom dengan ketentuan:
* **Nama Bucket:** `avatars`
* **Visibility:** Public (Centang opsi Public Bucket)

Jalankan script policy SQL ini untuk mengizinkan otorisasi upload/update:
```sql
-- SELECT: Publik bisa melihat semua foto profil di peta
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- INSERT: User terautentikasi bisa upload foto profil
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- UPDATE: User terautentikasi bisa update foto profil miliknya
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- DELETE: User terautentikasi bisa menghapus foto profil miliknya
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

---

## 📜 SOP Git Flow & Kolaborasi

Untuk menjaga codebase tetap stabil, seluruh developer wajib mengikuti protokol Git berikut:

* **Branch Utama (`main`):** Cabang rilis produksi. Dilarang keras melakukan push langsung ke `main`.
* **Branch Pengembangan (`develop`):** Cabang integrasi fitur harian.
* **Feature Branching:** Sebelum ngoding fitur baru, selalu buat branch baru dari `develop` dengan format: `feat/[nama-fitur]`, `fix/[nama-bug]`, atau `ui/[nama-layar]`.
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feat/sos-broadcast
  ```
* **Pull Request (PR):** Ketika fitur selesai, push branch kamu ke origin dan ajukan Pull Request ke branch **`develop`** untuk di-review oleh rekan tim.

---
*TiKum App — Selesai Masalah di Jalan, Fokus Koordinasi Nyaman.*