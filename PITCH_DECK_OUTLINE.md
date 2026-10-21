# Panduan Pitch Deck & Script Live Demo 10 Menit (Slide 10, 11, 12)

Dokumen ini dirancang khusus mengikuti struktur penilaian **Agentic AI Hackathon ITB Series 2026** (**10 menit Pitching + Live Demo**, **3 menit Tanya Jawab Juri**).

---

## Pembagian Waktu 10 Menit Presentasi

| Menit | Bagian | Isi Utama yang Ditampilkan |
| :--- | :--- | :--- |
| **00:00 – 02:00** | **1. Masalah & Pengguna Nyata** | Jutaan UMKM mikro di daerah sinyal 2G/EDGE gagal mengurus izin usaha (NIB) secara mandiri karena portal web modern berukuran **> 4 MB**, sering *timeout*, dan formulir KBLI berlapis. Padahal **98% pengguna aktif menggunakan WhatsApp & Voice Note**. |
| **02:00 – 03:30** | **2. Arsitektur Multi-Agent SatuAkses** | Tampilkan diagram 3-Agen: **(1) Intake Agent** (Whisper STT Bahasa Daerah + Gemini Vision OCR KTP) $\rightarrow$ **(2) Planner Agent** (Tool Lookup KBLI 2020 + Guardrail Validasi + *Human-in-the-Loop Gate*) $\rightarrow$ **(3) Action Agent** (Playwright Cloud Headless Browser + *Self-Healing 503 Retry*). |
| **03:30 – 08:30** | **3. LIVE DEMO (3 Skenario Wajib Slide 11)** | Buka `http://127.0.0.1:8000` dan jalankan 3 tombol skenario secara berurutan di depan juri. |
| **08:30 – 10:00** | **4. Dampak, Transparansi Simulasi & Penutup** | Tunjukkan penghematan kuota **98.8% (52 KB vs 4.380 KB)**, jelaskan secara jujur bagian yang aktual vs simulasi (sesuai Slide 11), dan tutup dengan rencana validasi UMKM. |

---

## Urutan Klik Saat Live Demo (Menit 03:30 – 08:30)

1. **Tunjukkan Skenario 1 (Alur Utama Sukses + Human-in-the-Loop):**
   - Klik tombol **🟢 1. Alur Utama + Human-in-the-Loop**.
   - Tunjukkan ke juri: Ibu Sari mengirim foto KTP + Voice Note campuran Bahasa Sunda/Indonesia.
   - Tunjukkan Panel Tengah: **Intake Agent** (Gemini 2.5 Flash Multimodal) mengekstrak NIK & data usaha; **Planner Agent** memetakan ke **KBLI 10794 (Industri Keripik)**.
   - **Sorot Poin Penting Slide 11:** Tunjukkan bahwa sistem **berhenti di Titik Persetujuan Manusia (*Human-in-the-Loop*)** dan tidak berani men-submit dokumen hukum sebelum Ibu Sari membalas **`SETUJU`**.
   - Klik tombol **✅ Balas "SETUJU" & Jalankan Playwright** (centang *"Tampilkan Jendela Browser Asli"* jika ingin juri melihat Chromium mengetik sendiri!).
   - Tunjukkan Panel Kanan: Bukti *screenshot* Tahap 1, Tahap 2, dan **Sertifikat NIB Resmi** yang langsung terkirim balik ke WhatsApp Ibu Sari!

2. **Tunjukkan Skenario 2 (Kondisi Gagal 1 — Input KTP Buram / Data Kurang):**
   - Klik tombol **🟡 2. Kondisi Gagal 1: KTP Buram / Data Kurang**.
   - Tunjukkan bagaimana **Planner Agent** mendeteksi NIK terkena silau dan nama/modal usaha belum disebutkan.
   - Agen **menolak membuka browser** (menghemat komputasi & kuota) dan bertanya balik secara spesifik di WhatsApp. Klik tombol *Voice Note Susulan* untuk menunjukkan bagaimana agen melanjutkan proses setelah dilengkapi.

3. **Tunjukkan Skenario 3 (Kondisi Gagal 2 — Server Portal Error 503 & Auto-Retry):**
   - Klik tombol **🔴 3. Kondisi Gagal 2: Portal 503 & Auto-Retry**, lalu klik **SETUJU**.
   - Tunjukkan di Panel Kanan: pada Percobaan #1, portal mengalami **HTTP 503 (Server Pusat Sibuk)**.
   - Alih-alih gagal dan menyuruh warga desa mengulang dari awal, **Action Agent** menyimpan *checkpoint* data formulir dan melakukan *auto-retry* hingga Sertifikat NIB berhasil terbit!

---

## Contekan Jawaban untuk 3 Menit Tanya-Jawab Juri (Q&A)

- **Q1: "Kenapa harus pakai Multi-Agent, kenapa tidak script automasi biasa?"**
  - *Jawab:* Karena input warga desa sangat tidak terstruktur (campuran suara bahasa daerah + foto KTP dengan kualitas kamera beragam) sementara outputnya harus sangat presisi secara hukum (pemilihan kode KBLI 5 digit & pengisian DOM multi-halaman). Pemisahan **Intake Agent** (persepsi multimodal), **Planner Agent** (validasi, *tool lookup* KBLI, & *human-in-the-loop gate*), serta **Action Agent** (eksekusi browser & *error recovery*) memastikan kegagalan di satu tahap tidak merusak tahap lain.
- **Q2: "Bagaimana jika struktur HTML portal pemerintah berubah atau ada CAPTCHA/OTP?"**
  - *Jawab:* Karena arsitektur kami memiliki mekanisme *Human-in-the-Loop* via WhatsApp, jika portal meminta kode OTP yang dikirim ke SMS pengguna, *Action Agent* cukup mem-pause sesi Playwright dan meminta pengguna membalas 6 digit OTP tersebut di WhatsApp, lalu melanjutkannya ke browser.
- **Q3: "Bagian mana yang simulasi dan bagian mana yang sudah berjalan nyata?"**
  - *Jawab:* Sesuai pedoman Slide 11, kami transparan: pemanggilan **Gemini 2.5 Flash Multimodal API**, orkestrasi **LangGraph**, pencarian **KBLI 2020**, dan eksekusi **Playwright Chromium** yang mengisi form & mengambil *screenshot* adalah **100% nyata**. Yang disimulasikan adalah UI WhatsApp di browser (agar juri mudah mengamati *trace*) dan situs target `/portal` beserta KTP fiktif demi menjaga keamanan data pribadi (Slide 14).
