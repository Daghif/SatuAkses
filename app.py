import os
import time
import logging
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from sample_assets import ensure_sample_assets
from agents import (
    AgentState,
    run_langgraph_intake_and_plan,
    run_action_agent,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("satuakses.app")

# Read headless mode from .env (can be overridden per-request via form param)
_ENV_HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() != "false"

# Startup: validate Gemini & Vertex AI configuration
_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
_GCP_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
_GCP_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
_CRED_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

if _API_KEY:
    logger.info("[Config] Gemini API Key detected (Live Google GenAI Client ready).")
elif _CRED_FILE and os.path.exists(_CRED_FILE):
    logger.info("[Config] Service Account JSON detected: %s (Vertex AI ready).", _CRED_FILE)
elif _GCP_PROJECT:
    logger.info("[Config] Vertex AI project=%s location=%s (Requires ADC login or API Key).", _GCP_PROJECT, _GCP_LOCATION)
else:
    logger.info("[Config] Running with Smart Regex NLP Engine (Gemini API not configured).")

# Ensure directories & sample assets exist on startup
os.makedirs("static/samples", exist_ok=True)
os.makedirs("static/screenshots", exist_ok=True)
os.makedirs("static/uploads", exist_ok=True)
os.makedirs("static/dist/assets", exist_ok=True)
ensure_sample_assets("static/samples")

app = FastAPI(
    title="SatuAkses — Multi-Agent Web-Bridge",
    description="Jembatan Layanan Portal Web via Suara Bahasa Daerah & Foto KTP di WhatsApp Hemat Kuota (Agentic AI Hackathon ITB 2026)",
    version="2.0.0",
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/assets", StaticFiles(directory="static/dist/assets"), name="assets")

# In-memory state store for active sessions (LangGraph checkpoint memory)
SESSIONS: Dict[str, AgentState] = {}
PORTAL_SUBMISSIONS: List[Dict[str, Any]] = []


@app.get("/", response_class=HTMLResponse)
async def index_page():
    dist_index = os.path.join("static", "dist", "index.html")
    if os.path.exists(dist_index):
        with open(dist_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/portal", response_class=HTMLResponse)
async def portal_simulation_page():
    with open("templates/portal.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.post("/api/portal-submissions")
async def record_portal_submission(request: Request):
    data = await request.json()
    data["submitted_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    PORTAL_SUBMISSIONS.append(data)
    logger.info("[PortalSubmission] Total submissions: %d", len(PORTAL_SUBMISSIONS))
    return JSONResponse({"ok": True, "total_submissions": len(PORTAL_SUBMISSIONS)})


@app.get("/api/portal-submissions")
async def list_portal_submissions():
    return JSONResponse({"submissions": PORTAL_SUBMISSIONS})


@app.get("/api/health")
async def health_check():
    """Quick health check — reports Gemini / Vertex AI config status."""
    auth_mode = "api_key" if _API_KEY else ("service_account" if (_CRED_FILE and os.path.exists(_CRED_FILE)) else ("vertex_ai_adc" if _GCP_PROJECT else "regex_offline"))
    return JSONResponse({
        "status": "ok",
        "auth_mode": auth_mode,
        "gemini_api_key_set": bool(_API_KEY),
        "vertex_ai_project": _GCP_PROJECT or None,
        "vertex_ai_location": _GCP_LOCATION,
        "playwright_headless": _ENV_HEADLESS,
    })


@app.post("/api/agent/intake-plan")
async def api_intake_and_plan(
    session_id: str = Form("default-session"),
    scenario_mode: str = Form("happy_path"),
    voice_text: str = Form(""),
    simulate_503: str = Form("false"),
    ktp_file: Optional[UploadFile] = File(None),
):
    """
    Runs Agent 1 (Intake Agent: Gemini Vision OCR via Vertex AI) and
    Agent 2 (Planner Agent: KBLI Tool Lookup + Schema Validation + Human-in-the-Loop Gate).
    """
    existing_state = SESSIONS.get(session_id, {})
    keep_memory = scenario_mode in ("custom", "catat_kas", "konsultasi_usaha")
    prev_intake = existing_state.get("intake_result", {}) if keep_memory else {}
    prev_logs = existing_state.get("trace_logs", []) if keep_memory else []
    prev_ledger = existing_state.get("cashflow_ledger", []) if keep_memory else []
    prev_summary = existing_state.get("cashflow_summary", {}) if keep_memory else {}
    prev_consult = existing_state.get("consultation_result", {}) if keep_memory else {}

    has_custom_ktp = False
    if ktp_file and ktp_file.filename:
        ext = os.path.splitext(ktp_file.filename)[1] or ".png"
        saved_path = os.path.join("static", "uploads", f"ktp_{session_id}{ext}")
        content = await ktp_file.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        ktp_path = saved_path
        has_custom_ktp = True
    elif scenario_mode == "custom":
        ktp_path = existing_state.get("ktp_image_path", "")
        has_custom_ktp = bool(existing_state.get("has_custom_ktp", False) or ktp_path)
    elif scenario_mode == "incomplete_data":
        ktp_path = "static/samples/ktp_buram.png"
    else:
        ktp_path = "static/samples/ktp_ibu_sari.png"

    initial_state: AgentState = {
        "session_id": session_id,
        "scenario_mode": scenario_mode,
        "voice_text_raw": voice_text,
        "ktp_image_path": ktp_path,
        "has_custom_ktp": has_custom_ktp,
        "previous_intake": prev_intake,
        "cashflow_ledger": prev_ledger,
        "cashflow_summary": prev_summary,
        "consultation_result": prev_consult,
        "simulate_503": simulate_503.lower() == "true",
        "headless": _ENV_HEADLESS,
        "trace_logs": prev_logs,
    }

    logger.info(
        "[API] intake-plan: session=%s scenario=%s has_custom_ktp=%s",
        session_id, scenario_mode, has_custom_ktp,
    )
    updated_state = await asyncio.to_thread(run_langgraph_intake_and_plan, initial_state)
    SESSIONS[session_id] = updated_state
    return JSONResponse(updated_state)


@app.post("/api/agent/approve-action")
async def api_approve_and_execute_action(
    request: Request,
    session_id: str = Form("default-session"),
    headless: str = Form("default"),
):
    """
    Resumes LangGraph execution after Human-in-the-Loop approval ('SETUJU')
    and triggers Agent 3 (Action Agent: Playwright Headless/Headed Browser Automation).
    Runs in a worker thread via asyncio.to_thread so FastAPI continues serving /portal concurrently.
    headless param: 'true' / 'false' / 'default' (reads PLAYWRIGHT_HEADLESS from .env)
    """
    state = SESSIONS.get(session_id)
    if not state:
        # Create default state if session expired
        logger.warning("[API] approve-action: session %s not found — creating default state.", session_id)
        state = await asyncio.to_thread(
            run_langgraph_intake_and_plan,
            {
                "session_id": session_id,
                "scenario_mode": "happy_path",
                "voice_text_raw": "",
                "ktp_image_path": "static/samples/ktp_ibu_sari.png",
                "simulate_503": False,
                "headless": _ENV_HEADLESS,
                "trace_logs": [],
            },
        )

    # Resolve headless: explicit param overrides .env default
    if headless.lower() == "true":
        state["headless"] = True
    elif headless.lower() == "false":
        state["headless"] = False
    else:
        state["headless"] = _ENV_HEADLESS

    port = os.getenv("PORT", "8000")
    base_url = f"http://127.0.0.1:{port}"

    logger.info(
        "[API] approve-action: session=%s headless=%s base_url=%s",
        session_id, state["headless"], base_url,
    )
    final_state = await asyncio.to_thread(run_action_agent, state, base_url)
    SESSIONS[session_id] = final_state
    return JSONResponse(final_state)


if __name__ == "__main__":
    import sys
    import uvicorn

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    port = int(os.getenv("PORT", "8000"))
    print("\n=======================================================")
    print(f"[READY] SatuAkses Command Center : http://127.0.0.1:{port}")
    print(f"[READY] Portal NIB Simulasi      : http://127.0.0.1:{port}/portal")
    print(f"[READY] Health Check             : http://127.0.0.1:{port}/api/health")
    print(f"[CONFIG] Vertex AI Project       : {_GCP_PROJECT or '(not set)'}")
    print(f"[CONFIG] Playwright Headless     : {_ENV_HEADLESS}")
    print("=======================================================\n")
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
