# Bukti Pengujian Prototype SatuAkses (Slide 11 & 12)

Dokumen ini merangkum skenario pengujian, input, hasil aktual, kendala, serta titik pengawasan manusia (*Human-in-the-Loop*) pada prototype **SatuAkses**.

---

## Ringkasan Skenario Uji

| ID | Nama Skenario | Tujuan Uji (Rubrik Slide 11) | Input Pengguna | Titik Pengawasan Manusia (*Human-in-the-Loop*) | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UJI-01** | **Alur Utama Sukses (Happy Path)** | Menguji alur penuh dari suara bahasa daerah + KTP hingga terbit Sertifikat NIB via Playwright. | Foto `ktp_ibu_sari.png` + Voice Note Sunda/Indonesia (*"Keripik Singkong Berkah, modal 5 juta"*). | **Wajib:** Planner Agent menahan proses & meminta balasan **`SETUJU`** di WhatsApp sebelum membuka browser. | KBLI dipetakan ke `10794`. Setelah user klik/ketik `SETUJU`, Playwright mengisi Tahap 1 & 2, lalu menerbitkan `NIB-2026-820003-99` beserta bukti gambar sertifikat. Kuota hemat **98.8%** (52.1 KB vs 4.380 KB). | ✅ **LULUS** |
| **UJI-02** | **Kondisi Gagal 1: KTP Buram & Data Kurang** | Menguji *guardrail* validasi pada `Planner Agent` saat input tidak memenuhi syarat form. | Foto `ktp_buram.png` (NIK tertutup silau) + Voice Note tanpa menyebut nama & modal usaha. | **Wajib:** Agen menolak menjalankan browser dan meminta manusia melengkapi data yang kurang terlebih dahulu. | `Planner Agent` mendeteksi 3 kekurangan data (NIK tidak 16 digit, nama usaha kosong, modal kosong), membatalkan eksekusi Playwright, dan mengirim pesan klarifikasi ke WhatsApp. Saat dikirim voice note susulan, alur lanjut normal. | ✅ **LULUS** |
| **UJI-03** | **Kondisi Gagal 2: Server Portal Error 503 & Auto-Retry** | Menguji ketahanan (*resilience / self-healing*) `Action Agent` saat portal web pemerintah *down/timeout*. | Sama seperti UJI-01, dengan parameter `simulate_503=true` pada portal target. | Setelah manusia menyetujui (`SETUJU`), pemulihan error jaringan ditangani otomatis oleh agen tanpa menyuruh manusia mengulang input. | Pada Percobaan #1, Playwright mendeteksi halaman `HTTP 503 Service Unavailable` dan menyimpan *screenshot* bukti gagal. Agen menyimpan *checkpoint* data form dan melakukan *auto-retry* (Percobaan #2) hingga NIB terbit sukses. | ✅ **LULUS** |

---

## Detail Pengawasan Manusia (*Human-in-the-Loop*)
1. **Verifikasi Identitas & KBLI Sebelum Submit Hukum:** Karena pendaftaran NIB merupakan dokumen perizinan resmi, `Action Agent` **dilarang** melakukan klik tombol *Submit* di portal sebelum pengguna membaca ringkasan (NIK, Nama, Nama Usaha, Kode KBLI, dan Modal) di WhatsApp dan membalas **`SETUJU`**.
2. **Penanganan Ketidakpastian OCR/Suara:** Jika tingkat keterbacaan KTP rendah atau informasi usaha ambigu, sistem secara otomatis mengembalikan kendali ke manusia melalui pertanyaan terarah di chat.

---

## Keterbatasan Saat Ini & Rencana Pengembangan Lanjutan
1. **Kanal Komunikasi:** Saat ini didemokan melalui *WhatsApp Low-Bandwidth Web Simulator* agar juri dapat mengamati *trace* 3-agen secara *real-time*. Untuk produksi, webhook FastAPI dapat langsung dihubungkan ke Meta WhatsApp Cloud API atau gateway WAHA.
2. **Situs Target:** Menggunakan *Portal SatuNIB Simulasi* (`/portal`) karena portal pemerintah asli menerapkan CAPTCHA dan melarang pengujian bot otomatis dengan data fiktif.
