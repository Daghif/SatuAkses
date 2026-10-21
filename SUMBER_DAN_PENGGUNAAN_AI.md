# Sumber, Lisensi, dan Transparansi Penggunaan AI (Slide 12 & 14)

Dokumen ini disusun untuk memenuhi persyaratan pengumpulan **Agentic AI Hackathon ITB Series 2026 (Slide 12 & Slide 14)**.

---

## 1. Model AI & API yang Digunakan
| Komponen | Model / Layanan | Penyedia | Tujuan Penggunaan |
| :--- | :--- | :--- | :--- |
| **Multimodal Intake Engine** | `gemini-2.5-flash` / `gemini-2.0-flash` | Google Cloud Vertex AI / Gemini API | Pemahaman pesan suara bahasa daerah (Sunda/Indonesia), ekstraksi OCR pada foto KTP simulasi, dan pembuatan output JSON terstruktur. |
| **Web Speech Recognition** | Browser Web Speech API (`id-ID`) | Standar Web W3C / Chromium | Perekaman suara langsung dari mikrofon laptop pada mode input kustom. |

---

## 2. Library, Framework & Tools Open-Source
| Nama Library | Versi | Lisensi | Fungsi dalam Prototype |
| :--- | :--- | :--- | :--- |
| **LangGraph** (`langgraph`) | `>=1.0.0` | MIT License | Orkestrasi *state machine* 3 agen (`Intake` $\rightarrow$ `Planner` $\rightarrow$ `Action`) dan manajemen *Human-in-the-Loop interrupt*. |
| **Playwright** (`playwright`) | `>=1.50.0` | Apache-2.0 | Eksekusi *headless/headed browser* otomatis pada `Action Agent` untuk mengisi formulir Portal SatuNIB. |
| **FastAPI & Uvicorn** | `>=0.115.0` | MIT / BSD-3 | Server backend API, penyedia UI *Command Center*, dan server *Portal SatuNIB Simulasi*. |
| **Pillow (PIL)** | `>=11.0.0` | MIT-CMU | Pembuatan gambar KTP simulasi sintetis (`sample_assets.py`) agar tidak menggunakan data pribadi asli. |
| **Google GenAI SDK / Requests** | `>=1.0.0` | Apache-2.0 | Komunikasi HTTP ke endpoint Google Cloud Vertex AI / Gemini API. |
| **Tailwind CSS (CDN)** | `v3` | MIT License | Styling antarmuka *3-Panel Command Center* dan *Portal SatuNIB Simulasi*. |

---

## 3. Dataset & Keamanan Data Pribadi (Kepatuhan Slide 14)
- **Tidak Ada Data Pribadi Asli (Zero Real PII):** Seluruh foto KTP (`ktp_ibu_sari.png` dan `ktp_buram.png`) dibangkitkan secara programatik menggunakan skrip Python (`sample_assets.py`) dengan NIK, nama, dan alamat fiktif berlabel `[DATA SIMULASI]`.
- **Referensi KBLI 2020:** Menggunakan subset kode Klasifikasi Baku Lapangan Usaha Indonesia (KBLI 2020) publik untuk sektor UMKM Mikro (10794, 47112, 56103, 10710, 01131).
- **Keamanan Kredensial:** Kunci API (`GEMINI_API_KEY`) disimpan di dalam berkas `.env` lokal yang dikecualikan melalui `.gitignore`.

---

## 4. Bagian yang Dibantu AI Assistant
Sesuai pedoman **Slide 14 (*"AI assistant boleh digunakan"*):**
1. **Perancangan & Penulisan Kode (*Vibe Coding*):** Tim menggunakan AI Coding Assistant (Google Antigravity / Gemini) untuk mempercepat pembuatan *boilerplate* FastAPI, antarmuka *3-Panel Command Center*, generator aset KTP sintetis, serta integrasi skrip Playwright.
2. **Penyuntingan Dokumentasi & Abstrak:** Merapikan struktur README, bukti pengujian, dan pemetaan skenario demo agar selaras dengan rubrik penilaian juri.
3. **Verifikasi Manusia oleh Tim:** Seluruh alur masalah, desain arsitektur 3-agen, logika *Human-in-the-Loop*, skenario kegagalan (*failure cases*), dan pengujian akhir dijalankan serta diverifikasi secara langsung oleh anggota tim.
