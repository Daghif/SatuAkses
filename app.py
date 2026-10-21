import os
import time
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

# Ensure directories & dummy KTP / voice note samples exist on startup
os.makedirs("static/samples", exist_ok=True)
os.makedirs("static/screenshots", exist_ok=True)
os.makedirs("static/uploads", exist_ok=True)
ensure_sample_assets("static/samples")

app = FastAPI(
    title="SatuAkses — Multi-Agent Web-Bridge",
    description="Jembatan Layanan Portal Web via Suara Bahasa Daerah & Foto KTP di WhatsApp Hemat Kuota (Agentic AI Hackathon ITB 2026)",
    version="1.0.0",
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory state store for active sessions (LangGraph checkpoint memory)
SESSIONS: Dict[str, AgentState] = {}
PORTAL_SUBMISSIONS: List[Dict[str, Any]] = []


@app.get("/", response_class=HTMLResponse)
async def index_page():
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
    return JSONResponse({"ok": True, "total_submissions": len(PORTAL_SUBMISSIONS)})


@app.get("/api/portal-submissions")
async def list_portal_submissions():
    return JSONResponse({"submissions": PORTAL_SUBMISSIONS})


@app.post("/api/agent/intake-plan")
async def api_intake_and_plan(
    session_id: str = Form("default-session"),
    scenario_mode: str = Form("happy_path"),
    voice_text: str = Form(""),
    simulate_503: str = Form("false"),
    ktp_file: Optional[UploadFile] = File(None),
):
    """
    Runs Agent 1 (Intake Agent: Whisper STT + Gemini Vision OCR) and
    Agent 2 (Planner Agent: KBLI Tool Lookup + Schema Validation + Human-in-the-Loop Gate).
    """
    has_custom_ktp = False
    if ktp_file and ktp_file.filename:
        ext = os.path.splitext(ktp_file.filename)[1] or ".png"
        saved_path = os.path.join("static", "uploads", f"ktp_{session_id}{ext}")
        content = await ktp_file.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        ktp_path = saved_path
        has_custom_ktp = True
    else:
        ktp_path = (
            "static/samples/ktp_buram.png"
            if scenario_mode == "incomplete_data"
            else "static/samples/ktp_ibu_sari.png"
        )

    existing_state = SESSIONS.get(session_id, {})
    prev_intake = existing_state.get("intake_result", {}) if scenario_mode == "custom" else {}
    prev_logs = existing_state.get("trace_logs", []) if scenario_mode == "custom" else []

    initial_state: AgentState = {
        "session_id": session_id,
        "scenario_mode": scenario_mode,
        "voice_text_raw": voice_text,
        "ktp_image_path": ktp_path,
        "has_custom_ktp": has_custom_ktp,
        "previous_intake": prev_intake,
        "simulate_503": simulate_503.lower() == "true",
        "headless": True,
        "trace_logs": prev_logs,
    }

    updated_state = await asyncio.to_thread(run_langgraph_intake_and_plan, initial_state)
    SESSIONS[session_id] = updated_state
    return JSONResponse(updated_state)


@app.post("/api/agent/approve-action")
async def api_approve_and_execute_action(
    request: Request,
    session_id: str = Form("default-session"),
    headless: str = Form("true"),
):
    """
    Resumes LangGraph execution after Human-in-the-Loop approval ('SETUJU')
    and triggers Agent 3 (Action Agent: Playwright Headless/Headed Browser Automation).
    Runs in a worker thread via asyncio.to_thread so FastAPI continues serving /portal concurrently.
    """
    state = SESSIONS.get(session_id)
    if not state:
        # Create default state if session expired
        state = await asyncio.to_thread(
            run_langgraph_intake_and_plan,
            {
                "session_id": session_id,
                "scenario_mode": "happy_path",
                "voice_text_raw": "",
                "ktp_image_path": "static/samples/ktp_ibu_sari.png",
                "simulate_503": False,
                "headless": True,
                "trace_logs": [],
            },
        )

    state["headless"] = headless.lower() != "false"
    port = os.getenv("PORT", "8000")
    base_url = f"http://127.0.0.1:{port}"

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
    print("=======================================================\n")
    uvicorn.run(app, host="127.0.0.1", port=port)
