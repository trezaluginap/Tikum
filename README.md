Ini *template* `README.md` yang sudah disusun dengan struktur profesional. Isinya memuat pengenalan proyek, panduan instalasi lokal untuk teman lu, dan SOP Git Flow yang mengikat.

Lu tinggal *copy* seluruh teks di dalam kotak kode di bawah ini, lalu *paste* ke file `README.md` di proyek lu. Ubah bagian `[username-lu]` dengan *username* GitHub lu yang asli.

```markdown
# TiKum (Titik Kumpul) 📍

Aplikasi pelacakan lokasi *real-time* ringan untuk manajemen rombongan konvoi, *touring*, atau *road trip*. Proyek ini dibangun untuk meminimalisir anggota terpisah menggunakan komunikasi kordinat instan antar pengguna.

---

## 🚀 Tech Stack
* **Frontend:** React Native (Expo CLI)
* **Backend & Database:** Supabase (PostgreSQL)
* **Real-time Engine:** Supabase Broadcast (WebSockets)

---

## 🛠️ Instalasi & Setup Lokal

1. **Clone repositori ini:**
   ```bash
   git clone [https://github.com/](https://github.com/)[username-lu]/TiKum-App.git
   cd TiKum-App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Environment Variables:**
   Minta *keys* Supabase kepada *Project Owner*. Buat file bernama `.env` di *root folder* proyek (sejajar dengan `package.json`) dan isi dengan format berikut:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-PANJANG]
   ```
   > **⚠️ PERINGATAN:** Jangan pernah melakukan *commit* file `.env` ke GitHub. Pastikan `.env` sudah terdaftar di dalam file `.gitignore`.

4. **Jalankan aplikasi:**
   ```bash
   npx expo start
   ```

---

## 📜 SOP Kolaborasi & Git Flow (WAJIB BACA)

Agar kode tidak mengalami *Merge Conflict* parah dan proyek tetap terstruktur layaknya standar industri, seluruh *developer* wajib mengikuti protokol di bawah ini.

### ⛔ Aturan Mutlak
**DILARANG KERAS MELAKUKAN `git push origin main`.** Cabang (`branch`) `main` adalah ruang suci yang hanya berisi kode stabil dan siap rilis. Seluruh proses integrasi fitur sehari-hari dilakukan di cabang **`develop`**.

### 🔄 Alur Kerja Harian

**1. Sinkronisasi Kode Terbaru**
Sebelum mulai *coding*, selalu pastikan posisi lu berada di cabang `develop` dan tarik pembaruan terbaru dari *server*:
```bash
git checkout develop
git pull origin develop
```

**2. Buat Cabang Baru (Branching)**
Jangan *coding* langsung di `develop`. Buat cabang khusus untuk tiket/fitur yang sedang lu kerjakan di Trello. Gunakan format penamaan: `feat/[nama-fitur]`, `fix/[nama-bug]`, atau `ui/[nama-layar]`.
```bash
git checkout -b feat/guest-registration
```

**3. Ngoding & Simpan (Commit)**
Eksekusi kode lu. Setelah fitur berfungsi, simpan perubahan secara lokal. Pesan *commit* harus jelas mendeskripsikan apa yang lu buat.
```bash
git add .
git commit -m "feat: Selesai membuat UI input form registrasi"
```

**4. Dorong ke GitHub (Push)**
Dorong cabang fitur tersebut ke *server* GitHub (BUKAN ke `main` atau `develop`).
```bash
git push origin feat/guest-registration
```

**5. Gabungkan Kode (Pull Request / PR)**
* Buka repositori TiKum di browser (GitHub).
* Klik tombol hijau **"Compare & pull request"**.
* Pastikan *base branch* diarahkan ke **`develop`** (target penggabungan).
* Beri tahu *partner* bahwa PR sudah siap direviu.
* **Reviewer:** Buka PR tersebut, cek kode. Jika tidak ada potensi *error*, *Reviewer* yang berhak mengklik tombol **Merge Pull Request**. (Jangan *merge* PR buatan sendiri).

---
*Catatan: SOP ini dibuat agar kita fokus menyelesaikan fitur (menyelesaikan masalah), bukan menghabiskan waktu berjam-jam untuk memperbaiki masalah Git (menciptakan masalah baru).*
```