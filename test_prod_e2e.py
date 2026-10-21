import requests
import json
import time

BASE = "https://satuakses-49024015367.us-central1.run.app"
print("==================================================================")
print("=== [CLOUD RUN PRODUCTION E2E FULL AUDIT VERIFICATION] ===")
print("==================================================================")

# 1. Main Page (React SPA Bundle)
r_home = requests.get(BASE, timeout=20)
assert r_home.status_code == 200, f"Home failed: {r_home.status_code}"
assert 'id="root"' in r_home.text or "/assets/" in r_home.text, "React root/assets missing"
print("  [1/9] GET / (React SPA Bundle)              : OK (HTTP 200)")

# 2. Redesigned Portal Page
r_portal = requests.get(f"{BASE}/portal", timeout=20)
assert r_portal.status_code == 200, f"Portal failed: {r_portal.status_code}"
assert "input-nik" in r_portal.text and "certificate-box" in r_portal.text, "Portal DOM elements missing"
print("  [2/9] GET /portal (GovTech Modern Redesign) : OK (HTTP 200)")

# 3. Health Check
r_health = requests.get(f"{BASE}/api/health", timeout=20)
assert r_health.status_code == 200, f"Health failed: {r_health.status_code}"
h_data = r_health.json()
print(f"  [3/9] GET /api/health                       : OK -> status={h_data.get('status')} auth_mode={h_data.get('auth_mode')}")

# 4. Skenario 1: Happy Path Intake & Plan
sid_1 = f"e2e-cloud-happy-{int(time.time())}"
r_intake1 = requests.post(f"{BASE}/api/agent/intake-plan", data={
    "session_id": sid_1,
    "scenario_mode": "happy_path",
    "voice_text": "Ibu Sari dari Desa Sukamaju Cilawu Garut daftar NIB usaha Keripik Singkong Berkah modal 5jt",
    "simulate_503": "false"
}, timeout=60)
assert r_intake1.status_code == 200, f"Intake 1 failed: {r_intake1.status_code}"
data1 = r_intake1.json()
assert data1["status"] == "WAITING_HUMAN_APPROVAL", f"Unexpected status: {data1['status']}"
kbli_1 = data1["planner_result"]["kbli_mapping"]["kode"]
print(f"  [4/9] POST /api/agent/intake-plan (Skenario 1): OK -> status={data1['status']} | KBLI={kbli_1}")

# 5. Skenario 1 Approval & Action Agent (Playwright in Cloud Run)
r_action = requests.post(f"{BASE}/api/agent/approve-action", data={
    "session_id": sid_1,
    "headless": "true"
}, timeout=90)
assert r_action.status_code == 200, f"Action failed: {r_action.status_code}"
act_data = r_action.json()
assert act_data.get("action_result", {}).get("success"), f"Playwright action failed: {act_data}"
nib_res = act_data["action_result"]["nib_number"]
shots_count = len(act_data["action_result"]["screenshots"])
print(f"  [5/9] POST /api/agent/approve-action (Playwright): OK -> NIB={nib_res} | screenshots={shots_count}")

# 6. Skenario 2: Incomplete Data / Guardrail Clarification
sid_2 = f"e2e-cloud-incomp-{int(time.time())}"
r_intake2 = requests.post(f"{BASE}/api/agent/intake-plan", data={
    "session_id": sid_2,
    "scenario_mode": "incomplete_data",
    "voice_text": "Pak Asep daftar izin usaha warung",
    "simulate_503": "false"
}, timeout=60)
assert r_intake2.status_code == 200
data2 = r_intake2.json()
assert data2["status"] == "WAITING_USER_CLARIFICATION", f"Unexpected guardrail status: {data2['status']}"
missing_cnt = len(data2["planner_result"]["missing_fields"])
print(f"  [6/9] POST /api/agent/intake-plan (Guardrail 2): OK -> status={data2['status']} | missing={missing_cnt} fields")

# 7. Skenario 3: Portal 503 Auto-Retry Flag
sid_3 = f"e2e-cloud-503-{int(time.time())}"
r_intake3 = requests.post(f"{BASE}/api/agent/intake-plan", data={
    "session_id": sid_3,
    "scenario_mode": "portal_503",
    "voice_text": "Ibu Sari daftar NIB",
    "simulate_503": "true"
}, timeout=60)
assert r_intake3.status_code == 200
data3 = r_intake3.json()
assert data3["simulate_503"] == True
print(f"  [7/9] POST /api/agent/intake-plan (503 Flag)    : OK -> simulate_503=True ready for checkpoint retry")

# 8. Skenario 4: Catat Kas Suara (HitungUang Engine)
sid_4 = f"e2e-cloud-kas-{int(time.time())}"
r_kas = requests.post(f"{BASE}/api/agent/intake-plan", data={
    "session_id": sid_4,
    "scenario_mode": "catat_kas",
    "voice_text": "Hari ini jual keripik 35 bungkus laku 350rb, beli minyak 60rb dan singkong 80rb",
    "simulate_503": "false"
}, timeout=60)
assert r_kas.status_code == 200
data_kas = r_kas.json()
assert data_kas["intent_mode"] == "cashflow_record"
cs = data_kas["cashflow_summary"]
print(f"  [8/9] POST /api/agent/intake-plan (HitungUang)  : OK -> Laba=Rp {cs['laba_bersih']:,} | Margin={cs['margin_persen']}%")

# 9. Skenario 5: Konsultasi Usaha AI
sid_5 = f"e2e-cloud-konsul-{int(time.time())}"
r_konsul = requests.post(f"{BASE}/api/agent/intake-plan", data={
    "session_id": sid_5,
    "scenario_mode": "konsultasi_usaha",
    "voice_text": "Bagaimana cara hitung HPP keripik singkong dan syarat KUR?",
    "simulate_503": "false"
}, timeout=60)
assert r_konsul.status_code == 200
data_konsul = r_konsul.json()
assert data_konsul["intent_mode"] == "business_consultation"
cr = data_konsul["consultation_result"]
hpp_val = cr["analisis_hpp"]["hpp_per_unit"]
has_copywriting = bool(cr.get("copywriting_wa_story"))
print(f"  [9/9] POST /api/agent/intake-plan (AI Advisor)  : OK -> HPP=Rp {hpp_val:,} | WA Story Ready={has_copywriting}")

print("==================================================================")
print(">>> [ALL 9 PROD E2E TESTS PASSED ON GOOGLE CLOUD RUN!] <<<")
print("==================================================================")
