import sys
import asyncio

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from agents import (
    run_langgraph_intake_and_plan,
    classify_user_intent,
    compute_cashflow_summary,
)
from app import api_intake_and_plan, SESSIONS


def test_cross_permutation_1_forward():
    print("\n==================================================================")
    print("=== [CROSS TEST 1] NIB -> Cek Kas -> Catat Kas -> Konsul -> Cek Kas ===")
    print("==================================================================")
    session_id = "cross-test-perm-1"

    # Step 1: Daftar NIB (Ibu Sari)
    s1 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "happy_path",
        "voice_text_raw": "",
        "ktp_image_path": "static/samples/ktp_ibu_sari.png",
        "simulate_503": False,
        "trace_logs": [],
    })
    assert s1["status"] == "WAITING_HUMAN_APPROVAL"
    assert "SARI WULANDARI" in s1["intake_result"]["nama_lengkap"].upper()
    assert s1["planner_result"]["kbli_mapping"]["kode"] == "10794"
    print(f"  [1. NIB] OK -> Terdaftar: {s1['intake_result']['nama_lengkap']} | Usaha: {s1['intake_result']['nama_usaha']} (KBLI 10794)")

    # Step 2: Cek Kas (Saat belum ada transaksi)
    s2 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "rekap buku kas",
        "previous_intake": s1["intake_result"],
        "cashflow_ledger": [],
        "trace_logs": s1["trace_logs"],
    })
    assert s2["intent_mode"] == "cashflow_query"
    assert "belum ada transaksi" in s2["whatsapp_reply"].lower()
    print("  [2. Cek Kas Kosong] OK -> Bot membalas ramah bahwa kas masih kosong beserta contoh format")

    # Step 3: Catat Kas Harian
    s3 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Alhamdulillah laku 30 bungkus 300rb, beli minyak 60rb dan singkong 70rb",
        "previous_intake": s2["intake_result"],
        "cashflow_ledger": s2["cashflow_ledger"],
        "trace_logs": s2["trace_logs"],
    })
    assert len(s3["cashflow_ledger"]) == 3
    assert s3["cashflow_summary"]["total_pemasukan"] == 300_000
    assert s3["cashflow_summary"]["total_pengeluaran"] == 130_000
    assert s3["cashflow_summary"]["laba_bersih"] == 170_000
    print(f"  [3. Catat Kas] OK -> 3 transaksi tercatat | Omset: Rp 300.000 | Laba: Rp {s3['cashflow_summary']['laba_bersih']:,}")

    # Step 4: Konsultasi Usaha AI (Membaca NIB + Kas Aktual Step 3)
    s4 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Teh gimana cara ngitung HPP per bungkus dan naikin omset jualan saya?",
        "previous_intake": s3["intake_result"],
        "cashflow_ledger": s3["cashflow_ledger"],
        "trace_logs": s3["trace_logs"],
    })
    assert s4["intent_mode"] == "business_consultation"
    assert s4["consultation_result"] is not None
    hpp = s4["consultation_result"]["analisis_hpp"]
    assert hpp["hpp_per_unit"] > 0
    assert "SARI WULANDARI" in s4["consultation_result"]["profil_umkm"]["nama_pemilik"].upper()
    print(f"  [4. Konsul AI] OK -> HPP: Rp {hpp['hpp_per_unit']:,}/bks | Untung: Rp {hpp['laba_per_unit']:,}/bks | KBLI: 10794")

    # Step 5: Cek Kas Lagi (Memastikan integritas saldo setelah konsultasi)
    s5 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "cek saldo kas dan untung",
        "previous_intake": s4["intake_result"],
        "cashflow_ledger": s4["cashflow_ledger"],
        "trace_logs": s4["trace_logs"],
    })
    assert s5["intent_mode"] == "cashflow_query"
    assert len(s5["cashflow_ledger"]) == 3
    assert "Rp 170.000" in s5["whatsapp_reply"]
    print(f"  [5. Cek Kas Lagi] OK -> Buku kas tetap utuh 3 transaksi (Laba Rp 170.000 tersimpan)!")


def test_cross_permutation_2_reverse():
    print("\n==================================================================")
    print("=== [CROSS TEST 2] Catat Kas -> Konsul -> Baru NIB -> Cek Kas ===")
    print("==================================================================")
    session_id = "cross-test-perm-2-rev"

    # Step 1: Catat Kas Duluan (Sebelum daftar NIB)
    s1 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Laku 25 porsi martabak 250rb, beli tepung dan telur 80rb, nabung 30rb",
        "previous_intake": {},
        "cashflow_ledger": [],
        "trace_logs": [],
    })
    assert s1["intent_mode"] == "cashflow_record"
    assert len(s1["cashflow_ledger"]) == 3
    assert s1["cashflow_summary"]["laba_bersih"] == 170_000
    print(f"  [1. Catat Kas Duluan] OK -> 3 transaksi tercatat tanpa NIB | Laba: Rp {s1['cashflow_summary']['laba_bersih']:,}")

    # Step 2: Konsultasi Usaha Duluan
    s2 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Gimana cara ngitung HPP martabak dan strategi paket hemat?",
        "previous_intake": s1["intake_result"],
        "cashflow_ledger": s1["cashflow_ledger"],
        "trace_logs": s1["trace_logs"],
    })
    assert s2["intent_mode"] == "business_consultation"
    hpp = s2["consultation_result"]["analisis_hpp"]
    assert hpp["hpp_per_unit"] > 0
    print(f"  [2. Konsul Duluan] OK -> HPP terhitung: Rp {hpp['hpp_per_unit']:,} berdasarkan kas Step 1")

    # Step 3: Baru Daftar NIB Resmi (Bapak Widodo, Martabak Notodewe, KBLI 10710)
    s3 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Saya Bapak Widodo dari Klaten, mau daftar NIB usaha namanya Martabak Notodewe modal 10jt, NIK 3205121203850009",
        "previous_intake": s2["intake_result"],
        "cashflow_ledger": s2["cashflow_ledger"],
        "trace_logs": s2["trace_logs"],
    })
    assert s3["status"] == "WAITING_HUMAN_APPROVAL"
    assert "WIDODO" in s3["intake_result"]["nama_lengkap"].upper()
    assert "10710" in s3["planner_result"]["kbli_mapping"]["kode"]
    print(f"  [3. Baru Daftar NIB] OK -> NIB Siap: {s3['intake_result']['nama_lengkap']} (KBLI {s3['planner_result']['kbli_mapping']['kode']})")

    # Step 4: Cek Kas setelah NIB terdaftar (Memastikan buku kas awal tidak terhapus oleh alur NIB)
    s4 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "rekap buku kas",
        "previous_intake": s3["intake_result"],
        "cashflow_ledger": s3["cashflow_ledger"],
        "trace_logs": s3["trace_logs"],
    })
    assert s4["intent_mode"] == "cashflow_query"
    assert len(s4["cashflow_ledger"]) == 3
    assert s4["cashflow_summary"]["laba_bersih"] == 170_000
    print(f"  [4. Cek Kas Pasca-NIB] OK -> 3 transaksi awal tetap utuh 100% dan terhubung ke nama pemilik baru!")


def test_cross_permutation_3_interrupted_slot_filling():
    print("\n==================================================================")
    print("=== [CROSS TEST 3] NIB Parsial -> Interupsi Kas -> Lengkapi NIB -> Konsul ===")
    print("==================================================================")
    session_id = "cross-test-perm-3-interrupted"

    # Step 1: User mulai NIB tapi data kurang (hanya nama dan alamat)
    s1 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Halo saya Pak Asep dari Desa Sukamaju Garut",
        "previous_intake": {},
        "cashflow_ledger": [],
        "trace_logs": [],
    })
    assert s1["status"] == "WAITING_USER_CLARIFICATION"
    print(f"  [1. NIB Parsial] OK -> Guardrail aktif: {len(s1['planner_result']['missing_fields'])} data belum lengkap")

    # Step 2: Di tengah-tengah menunggu klarifikasi NIB, user tiba-tiba catat kas
    s2 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "catat dulu hari ini laku 15 bungkus 150rb beli minyak 40rb",
        "previous_intake": s1["intake_result"],
        "cashflow_ledger": [],
        "trace_logs": s1["trace_logs"],
    })
    assert s2["intent_mode"] == "cashflow_record"
    assert len(s2["cashflow_ledger"]) == 2
    assert s2["cashflow_summary"]["laba_bersih"] == 110_000
    print(f"  [2. Interupsi Catat Kas] OK -> Router tepat memilih kas: 2 transaksi dicatat (Laba Rp 110.000)")

    # Step 3: User kembali melengkapi data NIB yang kurang
    s3 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Nama usaha Warung Kelontong Berkah Asep, modal usaha 5jt, NIK 3205121203850007",
        "previous_intake": s2["intake_result"],
        "cashflow_ledger": s2["cashflow_ledger"],
        "trace_logs": s2["trace_logs"],
    })
    # Harus kembali ke alur NIB dan sekarang LENGKAP
    assert s3["status"] == "WAITING_HUMAN_APPROVAL"
    assert s3["planner_result"]["is_complete"] is True
    assert "ASEP" in s3["intake_result"]["nama_lengkap"].upper()
    assert "Warung Kelontong" in s3["intake_result"]["nama_usaha"]
    print("  [3. Lengkapi NIB] OK -> Data NIB berhasil digabung dengan slot sebelumnya dan menjadi LENGKAP!")

    # Step 4: Konsultasi Usaha (Membaca gabungan NIB Pak Asep + Kas yang dicatat di Step 2)
    s4 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Gimana cara naikin untung warung kelontong saya dan syarat KUR BRI?",
        "previous_intake": s3["intake_result"],
        "cashflow_ledger": s3["cashflow_ledger"],
        "trace_logs": s3["trace_logs"],
    })
    assert s4["intent_mode"] == "business_consultation"
    assert "ASEP" in s4["consultation_result"]["profil_umkm"]["nama_pemilik"].upper()
    assert len(s4["cashflow_ledger"]) == 2
    print("  [4. Konsul Usaha] OK -> Membaca data legalitas NIB Pak Asep sekaligus catatan kas Rp 110.000!")


def test_cross_permutation_4_rapid_jumbled():
    print("\n==================================================================")
    print("=== [CROSS TEST 4] Bolak-Balik Acak: Konsul -> Kas 1 -> NIB -> Kas 2 -> Cek Kas -> Konsul ===")
    print("==================================================================")
    session_id = "cross-test-perm-4-jumbled"

    # Turn 1: Konsul umum dulu
    t1 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Tips jualan online biar laris di desa gimana ya?",
        "previous_intake": {},
        "cashflow_ledger": [],
        "trace_logs": [],
    })
    assert t1["intent_mode"] == "business_consultation"
    print("  [T1. Konsul Awal] OK")

    # Turn 2: Catat kas pagi (laku 100rb, beli bumbu 20rb)
    t2 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "pagi laku 100rb dan beli bumbu 20rb",
        "previous_intake": t1["intake_result"],
        "cashflow_ledger": t1["cashflow_ledger"],
        "trace_logs": t1["trace_logs"],
    })
    assert len(t2["cashflow_ledger"]) == 2
    assert t2["cashflow_summary"]["laba_bersih"] == 80_000
    print("  [T2. Kas Pagi] OK -> 2 transaksi | Laba Rp 80.000")

    # Turn 3: Bikin NIB (Bapak Joko, Ternak Lele, KBLI 01131)
    t3 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Saya Bapak Joko dari Klaten mau daftar NIB usaha Budidaya Ternak Lele modal 25jt, NIK 3205121203850001",
        "previous_intake": t2["intake_result"],
        "cashflow_ledger": t2["cashflow_ledger"],
        "trace_logs": t2["trace_logs"],
    })
    assert t3["status"] == "WAITING_HUMAN_APPROVAL"
    assert "01131" in t3["planner_result"]["kbli_mapping"]["kode"]
    print(f"  [T3. Daftar NIB] OK -> KBLI {t3['planner_result']['kbli_mapping']['kode']} (Ternak Lele)")

    # Turn 4: Catat kas sore (laku 200rb, beli pakan 50rb, nabung 30rb)
    t4 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "sore laku lele 200rb, beli pakan 50rb, nabung modal 30rb",
        "previous_intake": t3["intake_result"],
        "cashflow_ledger": t3["cashflow_ledger"],
        "trace_logs": t3["trace_logs"],
    })
    assert len(t4["cashflow_ledger"]) == 5  # 2 pagi + 3 sore
    assert t4["cashflow_summary"]["total_pemasukan"] == 300_000
    assert t4["cashflow_summary"]["total_pengeluaran"] == 70_000
    assert t4["cashflow_summary"]["laba_bersih"] == 230_000
    print(f"  [T4. Kas Sore] OK -> Akumulasi 5 transaksi | Total Omset: Rp 300.000 | Laba: Rp {t4['cashflow_summary']['laba_bersih']:,}")

    # Turn 5: Tanya Rekap Kas
    t5 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "total pemasukan dan saldo kas hari ini berapa?",
        "previous_intake": t4["intake_result"],
        "cashflow_ledger": t4["cashflow_ledger"],
        "trace_logs": t4["trace_logs"],
    })
    assert t5["intent_mode"] == "cashflow_query"
    assert "Rp 230.000" in t5["whatsapp_reply"]
    print("  [T5. Tanya Rekap] OK -> Bot melaporkan laba bersih Rp 230.000 secara akurat")

    # Turn 6: Konsul Lanjutan (Membaca Profil Lele KBLI 01131 + Kas 5 Transaksi)
    t6 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Gimana cara ngitung HPP bibit lele dan pakan biar untung maksimal?",
        "previous_intake": t5["intake_result"],
        "cashflow_ledger": t5["cashflow_ledger"],
        "trace_logs": t5["trace_logs"],
    })
    assert t6["intent_mode"] == "business_consultation"
    assert "01131" in t6["consultation_result"]["profil_umkm"]["kbli"]
    assert len(t6["cashflow_ledger"]) == 5
    print("  [T6. Konsul Lanjutan] OK -> Advisor menghitung HPP spesifik Lele (KBLI 01131) dengan riwayat kas nyata!")


async def test_fastapi_cross_session_continuity():
    print("\n==================================================================")
    print("=== [CROSS TEST 5] FastAPI REST Endpoint Session Continuity Test ===")
    print("==================================================================")
    session_id = "api-cross-session-fastapi"

    # Call 1: Daftar NIB via HTTP endpoint
    r1 = await api_intake_and_plan(
        session_id=session_id,
        scenario_mode="happy_path",
        voice_text="",
        simulate_503="false",
        ktp_file=None,
    )
    assert r1.status_code == 200

    # Call 2: Catat kas via HTTP endpoint dalam sesi yang sama
    r2 = await api_intake_and_plan(
        session_id=session_id,
        scenario_mode="custom",
        voice_text="Laku keripik 40 bungkus 400rb, beli minyak 80rb",
        simulate_503="false",
        ktp_file=None,
    )
    assert r2.status_code == 200
    state2 = SESSIONS[session_id]
    assert len(state2["cashflow_ledger"]) == 2

    # Call 3: Konsultasi usaha via HTTP endpoint dalam sesi yang sama
    r3 = await api_intake_and_plan(
        session_id=session_id,
        scenario_mode="custom",
        voice_text="Gimana cara naikin keuntungan saya?",
        simulate_503="false",
        ktp_file=None,
    )
    assert r3.status_code == 200
    state3 = SESSIONS[session_id]
    assert state3["intent_mode"] == "business_consultation"
    assert len(state3["cashflow_ledger"]) == 2
    assert "SARI WULANDARI" in state3["consultation_result"]["profil_umkm"]["nama_pemilik"].upper()
    print("  [FastAPI Sesi Kontinu] OK -> Session state mempertahankan data NIB & Buku Kas di seluruh HTTP request!")


if __name__ == "__main__":
    test_cross_permutation_1_forward()
    test_cross_permutation_2_reverse()
    test_cross_permutation_3_interrupted_slot_filling()
    test_cross_permutation_4_rapid_jumbled()
    asyncio.run(test_fastapi_cross_session_continuity())
    print("\n[SUCCESS] SEMUA 5 SKENARIO CROSS TEST (BOLAK-BALIK & PERMUTASI) LULUS 100%!")
