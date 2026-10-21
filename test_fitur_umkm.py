import sys
import asyncio

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from agents import (
    parse_currency_amount_id,
    classify_user_intent,
    parse_cashflow_transactions,
    compute_cashflow_summary,
    run_langgraph_intake_and_plan,
)
from app import api_intake_and_plan


def test_currency_normalizer_edge_cases():
    print("=== [TEST 1] Currency Normalizer Edge Cases ===")
    cases = [
        # Standard tokens
        ("15rb", 15_000),
        ("350 ribu", 350_000),
        ("60rebu", 60_000),
        ("50k", 50_000),
        ("1,5jt", 1_500_000),
        ("5 juta", 5_000_000),
        ("Rp 45.000", 45_000),
        ("Rp125.500", 125_500),
        # Compound tokens (Indonesian conversational spoken formats)
        ("2jt 500rb", 2_500_000),
        ("2 juta 500 ribu", 2_500_000),
        ("1jt 250k", 1_250_000),
        ("3jt 50rb", 3_050_000),
        # Spacing & punctuation variations
        ("1.5 jt", 1_500_000),
        ("2,5 juta", 2_500_000),
        ("500 k", 500_000),
        ("Rp. 50.000", 50_000),
        ("50000", 50_000),
        ("1000", 1_000),
        # Edge cases: empty, zero, invalid strings
        ("", 0),
        ("   ", 0),
        ("none", 0),
        ("tidak ada", 0),
    ]
    for raw, expected in cases:
        actual = parse_currency_amount_id(raw)
        assert actual == expected, f"Mismatch for '{raw}': got {actual}, expected {expected}"
        print(f"  [OK] '{raw:18}' -> Rp {actual:,}")


def test_intent_router_edge_cases():
    print("\n=== [TEST 2] Router Intent Classifier Edge Cases ===")
    cases = [
        # Explicit NIB Registration
        (
            "Assalamualaikum Teh, abdi Ibu Sari bade daftar NIB usaha Keripik Singkong modal 5 juta",
            "custom",
            False,
            "nib_registration",
        ),
        (
            "bikin nib nomor induk berusaha untuk toko kelontong",
            "custom",
            False,
            "nib_registration",
        ),
        # Multi-turn NIB Slot Filling (pending missing fields)
        (
            "Alamat di Desa Lembang, Kec. Lembang",
            "custom",
            True,
            "nib_registration",
        ),
        (
            "Nama saya Bapak Widodo",
            "custom",
            True,
            "nib_registration",
        ),
        (
            "modal usaha 10jt",
            "custom",
            True,
            "nib_registration",
        ),
        # Cashflow Recording (with conjunctions & multi-dialect)
        (
            "Alhamdulillah dinten ieu keripik payu 35 bungkus dapet 350rb, tadi meser minyak goreng 60rb",
            "custom",
            False,
            "cashflow_record",
        ),
        (
            "laku 100rb dan beli bensin 20rb",
            "custom",
            False,
            "cashflow_record",
        ),
        (
            "catat kas hari ini masuk 500rb keluar 150rb",
            "custom",
            False,
            "cashflow_record",
        ),
        (
            "nabung celengan modal 50rb",
            "custom",
            False,
            "cashflow_record",
        ),
        # Cashflow Query (Summary / Balance inquiries)
        (
            "Tolong lihat rekap kas dan untung hari ini",
            "custom",
            False,
            "cashflow_query",
        ),
        (
            "cek saldo kas usaha",
            "custom",
            False,
            "cashflow_query",
        ),
        (
            "laporan kas",
            "custom",
            False,
            "cashflow_query",
        ),
        (
            "rekap",
            "custom",
            False,
            "cashflow_query",
        ),
        (
            "omset berapa ya hari ini",
            "custom",
            False,
            "cashflow_query",
        ),
        # Business Consultation
        (
            "Gimana cara ngitung HPP per bungkus biar untung stabil dan syarat pengajuan KUR?",
            "custom",
            False,
            "business_consultation",
        ),
        (
            "bagaimana cara promosi jualan biar ramai pembeli",
            "custom",
            False,
            "business_consultation",
        ),
        (
            "kumaha carana daftar sertifikat halal gratis",
            "custom",
            False,
            "business_consultation",
        ),
        (
            "tips naikin omset warung kelontong",
            "custom",
            False,
            "business_consultation",
        ),
    ]
    for text, scen, pending_slot, expected_intent in cases:
        actual = classify_user_intent(text, scenario_mode=scen, has_pending_nib_slot=pending_slot)
        assert actual == expected_intent, f"Intent mismatch for '{text}': got {actual}, expected {expected_intent}"
        print(f"  [OK] Intent='{actual:22}' <- \"{text[:55]}...\"")


def test_multi_transaction_cashflow_edge_cases():
    print("\n=== [TEST 3] Multi-Transaction Parser Edge Cases ===")

    # Case A: Conjunction 'dan' split vs compound item preserve
    # Conjunction 'dan' followed by action verb should split
    s1 = "Laku 150rb dan beli bensin 20rb"
    items_s1 = parse_cashflow_transactions(s1)
    assert len(items_s1) == 2, f"Expected 2 items for '{s1}', got {items_s1}"
    assert items_s1[0]["tipe"] == "pemasukan" and items_s1[0]["harga"] == 150_000
    assert items_s1[1]["tipe"] == "pengeluaran" and items_s1[1]["harga"] == 20_000
    print(f"  [OK] Conjunction split: '{s1}' -> {len(items_s1)} items parsed cleanly")

    # Compound item with 'dan' but only one price should NOT split
    s2 = "Beli tepung dan kelapa 90rb"
    items_s2 = parse_cashflow_transactions(s2)
    assert len(items_s2) == 1, f"Expected 1 item for '{s2}', got {items_s2}"
    assert items_s2[0]["harga"] == 90_000
    assert "Tepung Dan Kelapa" in items_s2[0]["item"]
    print(f"  [OK] Compound item preserve: '{s2}' -> 1 item '{items_s2[0]['item']}'")

    # Case B: Units (bungkus, liter, tabung) that are NOT prices
    s3 = "Laku 20 bungkus 200rb, beli 5 liter minyak 75rb, beli 2 tabung gas 44rb, nabung 50rb"
    items_s3 = parse_cashflow_transactions(s3)
    assert len(items_s3) == 4, f"Expected 4 items for '{s3}', got {len(items_s3)}: {items_s3}"
    assert items_s3[0]["harga"] == 200_000 and items_s3[0]["tipe"] == "pemasukan"
    assert items_s3[1]["harga"] == 75_000 and items_s3[1]["tipe"] == "pengeluaran"
    assert items_s3[2]["harga"] == 44_000 and items_s3[2]["tipe"] == "pengeluaran"
    assert items_s3[3]["harga"] == 50_000 and items_s3[3]["tipe"] == "tabungan"
    print(f"  [OK] Unit quantities ignored as prices: '{s3}' -> 4 items correct")

    # Case C: Short isolated transaction (no item name specified)
    s4 = "Laku 100rb"
    items_s4 = parse_cashflow_transactions(s4)
    assert len(items_s4) == 1
    assert items_s4[0]["item"] == "Penjualan Produk Usaha"
    assert items_s4[0]["harga"] == 100_000
    print(f"  [OK] Isolated transaction fallback: '{s4}' -> item='{items_s4[0]['item']}'")


def test_cashflow_summary_financial_health_edge_cases():
    print("\n=== [TEST 4] Financial Summary & Health Alerts Edge Cases ===")

    # Edge Case 1: Deficit / Restocking Day (Expenses > 0, Income == 0)
    defisit_items = [
        {"item": "Beli Singkong Mentah", "harga": 300_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
        {"item": "Beli Minyak Goreng", "harga": 150_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
    ]
    sum_defisit = compute_cashflow_summary(defisit_items)
    assert sum_defisit["total_pemasukan"] == 0
    assert sum_defisit["total_pengeluaran"] == 450_000
    assert sum_defisit["laba_bersih"] == -450_000
    assert sum_defisit["margin_persen"] == 0.0  # Safe zero division handling!
    assert sum_defisit["health_status"] == "DEFISIT_STOK"
    print("  [OK] Restock/Deficit day handled safely without division by zero: health=DEFISIT_STOK")

    # Edge Case 2: High Expense Ratio Alert (Omset 100rb, Expenses 90rb -> 90% expense ratio)
    tipis_items = [
        {"item": "Penjualan Keripik", "harga": 100_000, "tipe": "pemasukan", "kategori": "penjualan_produk"},
        {"item": "Minyak Goreng Mahal", "harga": 85_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
    ]
    sum_tipis = compute_cashflow_summary(tipis_items)
    assert sum_tipis["health_status"] == "PERLU_PERHATIAN"
    assert sum_tipis["rasio_pengeluaran_persen"] == 85.0
    print(f"  [OK] High expense warning triggered: rasio={sum_tipis['rasio_pengeluaran_persen']}% -> PERLU_PERHATIAN")

    # Edge Case 3: Healthy Profit Day (Omset 350rb, Expenses 165rb, Tabungan 50rb)
    sehat_items = [
        {"item": "Penjualan Keripik 35 Bungkus", "harga": 350_000, "tipe": "pemasukan", "kategori": "penjualan_produk"},
        {"item": "Minyak Goreng", "harga": 60_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
        {"item": "Singkong Mentah", "harga": 80_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
        {"item": "Plastik", "harga": 25_000, "tipe": "pengeluaran", "kategori": "kemasan"},
        {"item": "Tabungan Modal", "harga": 50_000, "tipe": "tabungan", "kategori": "tabungan_usaha"},
    ]
    sum_sehat = compute_cashflow_summary(sehat_items)
    assert sum_sehat["health_status"] == "SEHAT"
    assert sum_sehat["laba_bersih"] == 185_000
    assert sum_sehat["margin_persen"] == 52.9
    print(f"  [OK] Healthy day: Laba=Rp {sum_sehat['laba_bersih']:,} (Margin {sum_sehat['margin_persen']}%) -> SEHAT")


def test_business_advisor_unit_economics_edge_cases():
    print("\n=== [TEST 5] Business Advisor Unit Economics Edge Cases ===")

    # Test dynamic unit detection when user sold 50 units (not default 35)
    custom_ledger = [
        {"item": "Penjualan Surabi 50 Porsi", "harga": 500_000, "tipe": "pemasukan", "kategori": "penjualan_produk"},
        {"item": "Tepung Beras & Kelapa", "harga": 150_000, "tipe": "pengeluaran", "kategori": "bahan_baku"},
        {"item": "Gas Elpiji", "harga": 25_000, "tipe": "pengeluaran", "kategori": "operasional"},
    ]
    state_adv = run_langgraph_intake_and_plan({
        "session_id": "test-adv-50unit",
        "scenario_mode": "konsultasi_usaha",
        "voice_text_raw": "Gimana cara ngitung HPP per porsi surabi saya dan buat promosi WA?",
        "previous_intake": {
            "nama_lengkap": "Bapak Widodo",
            "nama_usaha": "Surabi Notodewe",
            "jenis_usaha": "Industri Produk Roti, Kue dan Jajanan Pasar",
            "modal_usaha_rp": "3000000",
        },
        "cashflow_ledger": custom_ledger,
        "trace_logs": [],
    })
    assert state_adv["status"] == "CONSULTATION_COMPLETED"
    hpp_res = state_adv["consultation_result"]["analisis_hpp"]

    # Total expenses = 175.000 / 50 porsi = 3.500 per porsi
    assert hpp_res["hpp_per_unit"] == 3500
    # Total revenue = 500.000 / 50 porsi = 10.000 per porsi
    assert hpp_res["harga_jual_saat_ini"] == 10000
    assert hpp_res["laba_per_unit"] == 6500
    assert hpp_res["rekomendasi_bundling_3pcs"] > hpp_res["harga_jual_saat_ini"] * 2
    print(
        f"  [OK] Dynamic unit calculation (50 porsi): "
        f"HPP=Rp {hpp_res['hpp_per_unit']:,}/porsi | "
        f"Laba=Rp {hpp_res['laba_per_unit']:,}/porsi | "
        f"Bundling 3 Pcs=Rp {hpp_res['rekomendasi_bundling_3pcs']:,}"
    )


def test_multi_turn_lifecycle_and_query():
    print("\n=== [TEST 6] Multi-Turn Session Lifecycle & Query Handling ===")
    session_id = "test-session-multi-turn-edge"

    # Turn 1: NIB Registration Intake
    s1 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "happy_path",
        "voice_text_raw": "",
        "ktp_image_path": "static/samples/ktp_ibu_sari.png",
        "simulate_503": False,
        "trace_logs": [],
    })
    assert s1["status"] == "WAITING_HUMAN_APPROVAL"
    print("  [TURN 1] NIB Intake OK: Pemohon = Ibu Sari")

    # Turn 2: Cashflow Query before any transactions recorded (Edge Case)
    s2 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "rekap kas hari ini",
        "previous_intake": s1["intake_result"],
        "cashflow_ledger": [],
        "trace_logs": s1["trace_logs"],
    })
    assert s2["intent_mode"] == "cashflow_query"
    assert "belum ada transaksi" in s2["whatsapp_reply"].lower()
    print("  [TURN 2] Query on empty ledger handled with friendly instructions")

    # Turn 3: Record Morning Transactions
    s3 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Pagi ini laku 15 bungkus 150rb, beli singkong 50rb",
        "previous_intake": s2["intake_result"],
        "cashflow_ledger": s2["cashflow_ledger"],
        "trace_logs": s2["trace_logs"],
    })
    assert len(s3["cashflow_ledger"]) == 2
    assert s3["cashflow_summary"]["laba_bersih"] == 100_000
    print(f"  [TURN 3] Morning Transactions recorded: {len(s3['cashflow_ledger'])} items | Laba = Rp {s3['cashflow_summary']['laba_bersih']:,}")

    # Turn 4: Record Afternoon Transactions (Ledger accumulates!)
    s4 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Sore laku 20 bungkus 200rb, beli bumbu 30rb sama nabung 50rb",
        "previous_intake": s3["intake_result"],
        "cashflow_ledger": s3["cashflow_ledger"],
        "trace_logs": s3["trace_logs"],
    })
    assert len(s4["cashflow_ledger"]) == 5  # 2 morning + 3 afternoon = 5 items!
    assert s4["cashflow_summary"]["total_pemasukan"] == 350_000
    assert s4["cashflow_summary"]["total_pengeluaran"] == 80_000
    assert s4["cashflow_summary"]["laba_bersih"] == 270_000
    print(f"  [TURN 4] Afternoon Transactions accumulated: total {len(s4['cashflow_ledger'])} items | Laba = Rp {s4['cashflow_summary']['laba_bersih']:,}")

    # Turn 5: Cashflow Query with accumulated ledger
    s5 = run_langgraph_intake_and_plan({
        "session_id": session_id,
        "scenario_mode": "custom",
        "voice_text_raw": "Cek saldo dan rekap kas",
        "previous_intake": s4["intake_result"],
        "cashflow_ledger": s4["cashflow_ledger"],
        "trace_logs": s4["trace_logs"],
    })
    assert s5["intent_mode"] == "cashflow_query"
    assert "Rp 350.000" in s5["whatsapp_reply"]
    print("  [TURN 5] Query on accumulated ledger correctly returned summary (Rp 350.000)")


async def test_fastapi_edge_case_inputs():
    print("\n=== [TEST 7] FastAPI HTTP API Edge Case Inputs ===")

    # Empty voice text
    resp_empty = await api_intake_and_plan(
        session_id="api-edge-empty",
        scenario_mode="custom",
        voice_text="",
        simulate_503="false",
        ktp_file=None,
    )
    assert resp_empty.status_code == 200

    # Dialect with non-standard tokens
    resp_sunda = await api_intake_and_plan(
        session_id="api-edge-sunda",
        scenario_mode="custom",
        voice_text="Dinten ieu meser minyak 45rb teras laku 120rb",
        simulate_503="false",
        ktp_file=None,
    )
    assert resp_sunda.status_code == 200
    print("  [OK] FastAPI handles empty string and regional dialect voice text seamlessly")


if __name__ == "__main__":
    test_currency_normalizer_edge_cases()
    test_intent_router_edge_cases()
    test_multi_transaction_cashflow_edge_cases()
    test_cashflow_summary_financial_health_edge_cases()
    test_business_advisor_unit_economics_edge_cases()
    test_multi_turn_lifecycle_and_query()
    asyncio.run(test_fastapi_edge_case_inputs())
    print("\n[SUCCESS] SEMUA 7 SUITE PENGUJIAN EDGE CASE LULUS 100%!")
