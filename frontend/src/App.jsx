import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import anime from 'animejs';
import {
  CheckCheck,
  Mic,
  Send,
  ShieldAlert,
  Lock,
  Play,
  Sparkles,
  FileCheck2,
  Camera,
  Volume2,
  ArrowUpRight,
  Terminal,
  Layers,
  Wallet,
  Lightbulb,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Upload,
  Radio,
  Cpu,
  Zap,
  Eye,
  Maximize2,
} from 'lucide-react';
import AgentFlowCanvas from './components/AgentFlowCanvas';

const SCENARIOS = [
  {
    id: 'happy_path',
    label: '1. Alur Utama + HITL',
    shortDesc: 'Sunda STT + KTP OCR → NIB',
    accent: 'emerald',
    dot: 'bg-emerald-400',
    activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  },
  {
    id: 'incomplete_data',
    label: '2. KTP Buram / Guardrail',
    shortDesc: 'Deteksi Slot Kurang & Tanya Balik',
    accent: 'amber',
    dot: 'bg-amber-400',
    activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
  },
  {
    id: 'portal_503',
    label: '3. Portal 503 Self-Healing',
    shortDesc: 'Checkpoint & Auto-Retry',
    accent: 'rose',
    dot: 'bg-rose-400',
    activeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
  },
  {
    id: 'catat_kas',
    label: '4. Catat Kas Suara',
    shortDesc: 'HitungUang Multi-Transaksi',
    accent: 'cyan',
    dot: 'bg-cyan-400',
    activeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
  },
  {
    id: 'konsultasi_usaha',
    label: '5. Konsultasi AI',
    shortDesc: 'HPP, Bundling & KUR/Halal',
    accent: 'violet',
    dot: 'bg-violet-400',
    activeBg: 'bg-violet-500/15 border-violet-500/40 text-violet-200',
  },
];

function formatWaMarkdown(raw) {
  return (raw || '')
    .replace(/\*(.*?)\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(
      /`(.*?)`/g,
      '<code class="bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">$1</code>'
    )
    .replace(/\n/g, '<br/>');
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => 'session-' + Date.now());
  const [activeScenario, setActiveScenario] = useState('happy_path');
  const [headedBrowser, setHeadedBrowser] = useState(false);
  const [rightTab, setRightTab] = useState('shots');
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);

  // Bandwidth metrics animated state
  const [bwMetrics, setBwMetrics] = useState({
    total_satuakses_kb: 52.1,
    manual_portal_kb: 4380,
    savings_percent: 98.8,
    estimated_time_2g_satuakses: '~3.8 dtk',
  });
  const bwNumberRef = useRef(null);

  // WhatsApp Chat Messages
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'bot',
      timestamp: '08:00',
      tag: 'SatuAkses Multi-Agent Bridge',
      html: `Wilujeng sumping / Selamat datang! 👋<br/>Kirimkan <strong class="text-white">Foto KTP</strong> &amp; <strong class="text-white">Voice Note Bahasa Daerah</strong> untuk mengurus <strong class="text-emerald-300">Nomor Induk Berusaha (NIB)</strong>, mencatat <strong class="text-cyan-300">Buku Kas Suara</strong>, atau konsultasi HPP tanpa membuka portal web berat.`,
      footerHint: 'Pilih salah satu dari 5 skenario di bar atas atau ketik langsung di bawah.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);

  // Multi-Agent Orchestrator State
  const [orchestratorStatus, setOrchestratorStatus] = useState('IDLE / READY');
  const [intentMode, setIntentMode] = useState('nib_registration');
  const [agent1, setAgent1] = useState({
    badge: 'STANDBY',
    data: null,
    statusText: 'Menunggu input pesan suara bahasa daerah & foto KTP dari WhatsApp...',
  });
  const [agent2, setAgent2] = useState({
    badge: 'STANDBY',
    data: null,
    statusText: 'Menunggu hasil ekstraksi terstruktur dari Intake Agent...',
  });
  const [agent3, setAgent3] = useState({
    badge: 'LOCKED (HITL)',
    data: null,
    mode: 'nib',
    statusText: 'Terkunci oleh Human-in-the-Loop Gate. Hanya dieksekusi setelah otorisasi "SETUJU".',
  });
  const [traceLogs, setTraceLogs] = useState([]);

  // Right Panel Output States
  const [screenshots, setScreenshots] = useState([]);
  const [cashflowData, setCashflowData] = useState(null);
  const [consultData, setConsultData] = useState(null);
  const [copiedWa, setCopiedWa] = useState(false);

  // Lightbox Modal for inspecting KTP / Playwright Screenshots
  const [lightboxImg, setLightboxImg] = useState(null);

  // Custom Input Modal (Mic + KTP Upload)
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customVoiceText, setCustomVoiceText] = useState('');
  const [customKtpFile, setCustomKtpFile] = useState(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micStatus, setMicStatus] = useState('Siap merekam via Web Speech API');
  const recognitionRef = useRef(null);

  // Fetch health check on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealthInfo(d))
      .catch(() => {});
  }, []);

  // Auto-scroll WhatsApp chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, orchestratorStatus]);

  // Animate bandwidth savings counter with Anime.js
  useEffect(() => {
    if (!bwNumberRef.current) return;
    const obj = { val: 90.0 };
    anime({
      targets: obj,
      val: bwMetrics.savings_percent || 98.8,
      round: 10,
      easing: 'easeOutExpo',
      duration: 900,
      update: () => {
        if (bwNumberRef.current) {
          bwNumberRef.current.innerText = `Hemat ${obj.val.toFixed(1)}% Kuota`;
        }
      },
    });
  }, [bwMetrics]);

  const nowTime = () => {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  };

  const pushMessage = (msg) => {
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        timestamp: nowTime(),
        ...msg,
      },
    ]);
  };

  const applyBackendState = (state) => {
    if (state.bandwidth_metrics) {
      setBwMetrics(state.bandwidth_metrics);
    }
    if (state.intent_mode) {
      setIntentMode(state.intent_mode);
    }
    setOrchestratorStatus(state.status || 'READY');

    // Agent 1: Intake
    if (state.intake_result) {
      setAgent1({
        badge: 'DONE ✓',
        data: state.intake_result,
        statusText: null,
      });
    }

    // Agent 2: Planner
    if (state.planner_result) {
      const pr = state.planner_result;
      if (!pr.is_complete) {
        setAgent2({
          badge: 'GUARDRAIL STOP ⚠️',
          data: pr,
          statusText: null,
        });
      } else {
        setAgent2({
          badge: pr.human_approved ? 'APPROVED ✓' : 'WAITING HITL 🔒',
          data: pr,
          statusText: null,
        });
      }
    }

    // WhatsApp Reply Bubble
    if (state.whatsapp_reply) {
      pushMessage({
        sender: 'bot',
        tag:
          state.intent_mode === 'cashflow_record' || state.intent_mode === 'cashflow_query'
            ? 'HitungUang Cashflow Agent'
            : state.intent_mode === 'business_consultation'
            ? 'AI Business Advisor'
            : 'SatuAkses Orchestrator',
        html: formatWaMarkdown(state.whatsapp_reply),
        certificateShot: state.action_result?.certificate_screenshot || null,
        nibNumber: state.action_result?.nib_number || null,
      });
    }

    // Agent 3: Action Agent (Playwright)
    if (state.action_result) {
      const ar = state.action_result;
      setAgent3({
        badge: ar.recovered_from_503 ? 'RECOVERED & DONE ✓' : 'COMPLETED ✓',
        data: ar,
        mode: 'nib',
        statusText: null,
      });
      if (ar.screenshots && ar.screenshots.length > 0) {
        setScreenshots(ar.screenshots);
        setRightTab('shots');
      }
    }

    // Cashflow & Business Consultation in Right Panel Tab 2
    if (state.cashflow_summary || state.consultation_result) {
      if (state.cashflow_summary) {
        setCashflowData({
          summary: state.cashflow_summary,
          ledger: state.cashflow_ledger || [],
        });
      }
      if (state.consultation_result) {
        setConsultData(state.consultation_result);
      }

      if (state.intent_mode === 'cashflow_record' || state.intent_mode === 'cashflow_query') {
        setAgent3({
          badge: 'LEDGER SYNCED ✓',
          mode: 'cashflow',
          data: {
            txCount: (state.cashflow_ledger || []).length,
            summary: state.cashflow_summary,
          },
          statusText: null,
        });
        setRightTab('advisor');
      } else if (state.intent_mode === 'business_consultation' && state.consultation_result) {
        setAgent3({
          badge: 'ADVISOR READY ✓',
          mode: 'advisor',
          data: state.consultation_result,
          statusText: null,
        });
        setRightTab('advisor');
      }
    }

    if (state.trace_logs) {
      setTraceLogs(state.trace_logs);
    }
  };

  // Run one of the 5 Jury / Retention Scenarios
  const runScenario = async (mode) => {
    if (isLoading || isApproving) return;
    setActiveScenario(mode);
    setIsLoading(true);

    let activeSid = sessionId;
    if (mode !== 'catat_kas' && mode !== 'konsultasi_usaha') {
      activeSid = `scen-${mode}-${Date.now()}`;
      setSessionId(activeSid);
    }

    try {
      if (mode === 'catat_kas') {
        const kasText =
          'Alhamdulillah dinten ieu keripik singkong payu 35 bungkus dapet 350rb, tadi meser minyak goreng 60rb, singkong mentah 80rb, plastik kemasan 25rb, terus nabung modal 50rb.';
        pushMessage({
          sender: 'user',
          scenarioTag: 'Skenario 4 • Buku Kas Suara UMKM (HitungUang Engine)',
          audioUrl: '/static/samples/vn_ibu_sari.wav',
          audioMeta: '0:04 • 16 KB (2G Voice)',
          text: `"${kasText}"`,
        });

        setOrchestratorStatus('RUNNING CASHFLOW AGENT...');
        setAgent1({ badge: 'RUNNING', data: null, statusText: 'Mengekstrak multi-transaksi kas dari pesan suara...' });
        setAgent2({ badge: 'RUNNING', data: null, statusText: 'Menghitung Laba Bersih, Margin & Rasio Biaya...' });

        const formData = new FormData();
        formData.append('session_id', activeSid);
        formData.append('scenario_mode', 'catat_kas');
        formData.append('voice_text', kasText);
        formData.append('simulate_503', 'false');

        const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
        const data = await resp.json();
        applyBackendState(data);
        return;
      }

      if (mode === 'konsultasi_usaha') {
        const konsulText =
          'Teh, pengeluaran minyak goreng jeung bahan baku keripik teh naek wae. Kumaha cara ngitung HPP per bungkus biar untungna stabil, terus kumaha syarat daftar Halal & modal KUR?';
        pushMessage({
          sender: 'user',
          scenarioTag: 'Skenario 5 • Konsultasi Usaha AI (Kontekstual NIB + Kas)',
          audioUrl: '/static/samples/vn_ibu_sari.wav',
          audioMeta: '0:04 • 18 KB (2G Voice)',
          text: `"${konsulText}"`,
        });

        setOrchestratorStatus('RUNNING BUSINESS ADVISOR...');
        setAgent1({ badge: 'RUNNING', data: null, statusText: 'Membaca Profil NIB/KBLI + Riwayat Buku Kas UMKM...' });
        setAgent2({ badge: 'RUNNING', data: null, statusText: 'Menghitung HPP Unit, Strategi Bundling & Kelayakan KUR/Halal...' });

        const formData = new FormData();
        formData.append('session_id', activeSid);
        formData.append('scenario_mode', 'konsultasi_usaha');
        formData.append('voice_text', konsulText);
        formData.append('simulate_503', 'false');

        const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
        const data = await resp.json();
        applyBackendState(data);
        return;
      }

      // Scenarios 1, 2, 3 (NIB Bridge)
      const isBlur = mode === 'incomplete_data';
      const ktpImg = isBlur ? '/static/samples/ktp_buram.png' : '/static/samples/ktp_ibu_sari.png';
      const voiceText = isBlur
        ? 'Punten Kang, abdi Pak Asep ti Desa Mekarsari. Hoyong ngadamel izin usaha NIB kanggo warung kelontong di bumi, kumaha nya carana?'
        : "Assalamualaikum Teh, punten abdi Ibu Sari Wulandari ti Desa Sukamaju Cilawu Garut. Bade nyuhunkeun tulung didaftarkeun NIB usaha mikro abdi namina 'Keripik Singkong Berkah', modalna teh sakitar 5 juta rupiah, produksi 250 bungkus sasasih.";

      const scenarioTag =
        mode === 'happy_path'
          ? 'Skenario 1 • Alur Utama + Human-in-the-Loop'
          : mode === 'incomplete_data'
          ? 'Skenario 2 • Guardrail KTP Buram & Data Kurang'
          : 'Skenario 3 • Server Portal Error 503 & Auto-Retry';

      pushMessage({
        sender: 'user',
        scenarioTag,
        ktpImage: ktpImg,
        ktpCaption: isBlur ? 'Foto KTP Pemohon (Buram / Silau • 24 KB)' : 'Foto KTP Pemohon (Jelas • 29.4 KB)',
        audioUrl: '/static/samples/vn_ibu_sari.wav',
        audioMeta: '0:03 • 22 KB (Sunda Audio)',
        text: `"${voiceText}"`,
      });

      setOrchestratorStatus('RUNNING INTAKE & PLANNER...');
      setAgent1({ badge: 'RUNNING', data: null, statusText: 'Memproses Speech-to-Text Daerah & Gemini Vision OCR...' });
      setAgent2({ badge: 'STANDBY', data: null, statusText: 'Menunggu ekstraksi JSON dari Intake Agent...' });
      setAgent3({
        badge: 'LOCKED (HITL)',
        data: null,
        mode: 'nib',
        statusText: 'Menunggu otorisasi Human-in-the-Loop...',
      });

      const formData = new FormData();
      formData.append('session_id', activeSid);
      formData.append('scenario_mode', mode);
      formData.append('voice_text', voiceText);
      formData.append('simulate_503', mode === 'portal_503' ? 'true' : 'false');

      const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
      const data = await resp.json();
      applyBackendState(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve Human-in-the-Loop & Trigger Playwright Action Agent
  const approveHumanInTheLoop = async () => {
    if (isApproving) return;
    setIsApproving(true);

    pushMessage({
      sender: 'user',
      scenarioTag: 'Otorisasi Human-in-the-Loop',
      text: 'SETUJU — Silakan daftarkan usaha saya ke Portal SatuNIB.',
    });

    setOrchestratorStatus('EXECUTING PLAYWRIGHT BROWSER...');
    setAgent3({
      badge: 'EXECUTING BROWSER...',
      data: null,
      mode: 'nib',
      statusText: 'Membuka Chromium & mengisi formulir multi-step Portal SatuNIB...',
    });

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('headless', headedBrowser ? 'false' : 'true');

      const resp = await fetch('/api/agent/approve-action', { method: 'POST', body: formData });
      const data = await resp.json();
      applyBackendState(data);
    } finally {
      setIsApproving(false);
    }
  };

  // Compute smart quick-reply label when Guardrail stops for missing fields
  const getClarifyQuickReplyLabel = () => {
    const missing = agent2.data?.missing_fields || [];
    if (missing.some((f) => f.includes('NIK') || f.includes('KTP'))) {
      return "Balas Cepat: 'NIK saya 3205129988770001'";
    }
    if (missing.some((f) => f.includes('Nama Lengkap'))) {
      return "Balas Cepat: 'Nama saya Ohim'";
    }
    if (missing.some((f) => f.includes('Alamat'))) {
      return "Balas Cepat: 'Alamat di Desa Lembang, Kec. Lembang'";
    }
    if (missing.some((f) => f.includes('Modal'))) {
      return "Balas Cepat: 'Modal usaha 10jt'";
    }
    if (missing.some((f) => f.includes('Nama Usaha'))) {
      return "Balas Cepat: 'Nama usaha Toko Berkah'";
    }
    return 'Kirim Data Susulan Lengkap Otomatis';
  };

  // Send follow-up clarification to resolve Guardrail
  const sendFollowUpClarification = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (activeScenario === 'custom') {
        const label = getClarifyQuickReplyLabel();
        let followUp = 'Alamat usaha saya di Desa Lembang, Kec. Lembang.';
        if (label.includes('NIK saya')) followUp = 'NIK saya 3205129988770001';
        else if (label.includes('Nama saya')) followUp = 'Nama saya Ohim';
        else if (label.includes('Alamat di')) followUp = 'Alamat usaha saya di Desa Lembang, Kec. Lembang.';
        else if (label.includes('Modal usaha')) followUp = 'Modal usaha 10jt';
        else if (label.includes('Nama usaha')) followUp = 'Nama usaha Toko Berkah';

        pushMessage({
          sender: 'user',
          scenarioTag: 'Multi-Turn Slot Filling',
          text: `"${followUp}"`,
        });

        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('scenario_mode', 'custom');
        formData.append('voice_text', followUp);
        formData.append('simulate_503', 'false');

        const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
        const data = await resp.json();
        applyBackendState(data);
        return;
      }

      // From Scenario 2 (KTP Buram) -> Complete
      const completeMsg =
        'Saya Asep Supriatna dari Desa Mekarsari, NIK 3205121203850007, mau daftar NIB usaha namanya Warung Sembako Berkah Asep, modal 3,5 juta.';
      pushMessage({
        sender: 'user',
        scenarioTag: 'Voice Note Susulan + Foto KTP Jelas',
        text: `"Punten Teh, ini foto KTP jelas saya (NIK 3205121203850007). Nama usahanya Warung Sembako Berkah Asep, modal Rp 3.500.000, di Desa Mekarsari."`,
      });

      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('scenario_mode', 'custom');
      formData.append('voice_text', completeMsg);
      formData.append('simulate_503', 'false');

      const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
      const data = await resp.json();
      applyBackendState(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual chat bar submission
  const handleManualChatSend = async () => {
    const val = chatInput.trim();
    if (!val || isLoading || isApproving) return;
    setChatInput('');

    if (val.toUpperCase().includes('SETUJU') && orchestratorStatus === 'WAITING_HUMAN_APPROVAL') {
      await approveHumanInTheLoop();
      return;
    }

    setActiveScenario('custom');
    setIsLoading(true);
    pushMessage({
      sender: 'user',
      text: val,
    });

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('scenario_mode', 'custom');
      formData.append('voice_text', val);
      formData.append('simulate_503', 'false');

      const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
      const data = await resp.json();
      applyBackendState(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API Microphone Recording
  const toggleMicRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('Browser tidak mendukung Web Speech API, silakan ketik langsung.');
      return;
    }

    if (isRecordingMic && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecordingMic(false);
      setMicStatus('Rekaman selesai.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'id-ID';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      setIsRecordingMic(true);
      setMicStatus('Mendengarkan suara Anda...');
    };
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCustomVoiceText(transcript);
    };
    rec.onerror = () => {
      setIsRecordingMic(false);
      setMicStatus('Gagal akses mikrofon, silakan ketik teks suara.');
    };
    rec.onend = () => {
      setIsRecordingMic(false);
      setMicStatus('Transkripsi suara siap dikirim.');
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const submitCustomModal = async () => {
    const voiceText = customVoiceText.trim();
    if (!voiceText && !customKtpFile) {
      alert('Silakan masukkan teks pesan suara (atau rekam suara) atau pilih foto KTP terlebih dahulu.');
      return;
    }
    setCustomModalOpen(false);
    const newSid = 'custom-' + Date.now();
    setSessionId(newSid);
    setActiveScenario('custom');
    setIsLoading(true);

    pushMessage({
      sender: 'user',
      scenarioTag: 'Input Suara & KTP Kustom',
      ktpImage: customKtpFile ? URL.createObjectURL(customKtpFile) : null,
      ktpCaption: customKtpFile ? `Foto KTP Kustom (${customKtpFile.name})` : null,
      text: voiceText ? `"${voiceText}"` : null,
    });

    try {
      const formData = new FormData();
      formData.append('session_id', newSid);
      formData.append('scenario_mode', 'custom');
      formData.append('voice_text', voiceText);
      formData.append('simulate_503', 'false');
      if (customKtpFile) {
        formData.append('ktp_file', customKtpFile);
      }

      const resp = await fetch('/api/agent/intake-plan', { method: 'POST', body: formData });
      const data = await resp.json();
      applyBackendState(data);
    } finally {
      setIsLoading(false);
      setCustomKtpFile(null);
      setCustomVoiceText('');
    }
  };

  const copyWaStory = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  return (
    <div className="min-h-screen bklit-grid-bg text-zinc-100 flex flex-col font-sans">
      {/* ================= TOP COMMAND BAR (BKLIT UI / LINEAR STYLE) ================= */}
      <header className="sticky top-0 z-30 bg-[#09090b]/85 backdrop-blur-xl border-b border-white/[0.07] px-4 py-2.5">
        <div className="max-w-[1640px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition" />
              <div className="relative w-9 h-9 rounded-xl bg-zinc-950 border border-white/15 flex items-center justify-center font-mono font-bold text-sm text-emerald-400">
                SA
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">SatuAkses</h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                  2G/3T Web-Bridge
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {healthInfo?.auth_mode === 'api_key' || healthInfo?.auth_mode === 'vertex_ai_adc'
                    ? 'Gemini 2.5 Live + LangGraph'
                    : 'Hybrid Multimodal Engine'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Autonomous WhatsApp Voice &amp; Vision Bridge for High-Latency Government Portals
              </p>
            </div>
          </div>

          {/* 5 Scenario Switcher Pills with Motion Layout Indicator */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/90 p-1 rounded-xl border border-white/[0.07]">
            {SCENARIOS.map((scen) => {
              const isSelected = activeScenario === scen.id;
              return (
                <button
                  key={scen.id}
                  onClick={() => runScenario(scen.id)}
                  disabled={isLoading || isApproving}
                  title={scen.shortDesc}
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  } disabled:opacity-50`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeScenarioPill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className={`absolute inset-0 rounded-lg border ${scen.activeBg}`}
                    />
                  )}
                  <span className={`relative z-10 w-1.5 h-1.5 rounded-full ${scen.dot}`} />
                  <span className="relative z-10 tracking-tight">{scen.label}</span>
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

            {/* Headed Browser Toggle */}
            <label
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-300 hover:bg-white/[0.04] cursor-pointer select-none transition"
              title="Tampilkan jendela browser Chromium asli saat Action Agent berjalan di lokal"
            >
              <input
                type="checkbox"
                checked={headedBrowser}
                onChange={(e) => setHeadedBrowser(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
              />
              <span className="font-mono text-[10px]">Headed UI</span>
            </label>
          </div>
        </div>
      </header>

      {/* ================= 3-PANEL BKLIT COMMAND CENTER GRID ================= */}
      <main className="max-w-[1640px] w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5">
        {/* ================= PANEL 1 (LEFT - 4 COLS): WHATSAPP 2G SIMULATOR ================= */}
        <section className="lg:col-span-4 bklit-card rounded-2xl flex flex-col overflow-hidden h-[calc(100vh-76px)] min-h-[680px]">
          {/* 2G/EDGE Bandwidth Telemetry Header */}
          <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-white/[0.07]">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-mono text-[11px] text-zinc-300">EDGE / 2G Link (45 kbps)</span>
              </div>
              <span
                ref={bwNumberRef}
                className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              >
                Hemat {bwMetrics.savings_percent}% Kuota
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bklit-subcard rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400">SatuAkses WA Bridge</div>
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    {bwMetrics.total_satuakses_kb} KB{' '}
                    <span className="text-[10px] font-normal text-zinc-400">
                      ({bwMetrics.estimated_time_2g_satuakses})
                    </span>
                  </div>
                </div>
                <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>

              <div className="bklit-subcard rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400">Portal Web Manual</div>
                  <div className="font-mono text-xs font-bold text-rose-400">
                    {Number(bwMetrics.manual_portal_kb).toLocaleString()} KB{' '}
                    <span className="text-[10px] font-normal text-zinc-500">(Timeout)</span>
                  </div>
                </div>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400/70" />
              </div>
            </div>
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#14191f] px-3.5 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-mono font-bold text-xs text-white shadow">
                SA
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  <span>SatuAkses Bot Resmi (UMKM &amp; Desa)</span>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-400/90 font-mono">
                  online • multimodal stt + vision ocr
                </div>
              </div>
            </div>

            <button
              onClick={() => setCustomModalOpen(true)}
              className="flex items-center gap-1 text-[11px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-200 px-2.5 py-1 rounded-lg font-medium transition"
            >
              <Mic className="w-3 h-3 text-emerald-400" />
              <span>Input Kustom</span>
            </button>
          </div>

          {/* WhatsApp Message Stream with Motion.dev Spring Physics */}
          <div
            ref={chatScrollRef}
            className="wa-pattern-bg flex-1 p-3.5 overflow-y-auto space-y-3"
          >
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[89%] rounded-2xl p-3 text-xs shadow-md space-y-2 border ${
                        isUser
                          ? 'bg-[#074e3f] border-emerald-500/30 text-zinc-100 rounded-tr-xs'
                          : 'bg-[#181f26] border-white/[0.08] text-zinc-200 rounded-tl-xs'
                      }`}
                    >
                      {/* Scenario / Agent Header Tag */}
                      {(m.scenarioTag || m.tag) && (
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                          <span
                            className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                              isUser ? 'text-emerald-200' : 'text-emerald-400'
                            }`}
                          >
                            {m.scenarioTag || m.tag}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">{m.timestamp}</span>
                        </div>
                      )}

                      {/* Optional KTP Image Attachment */}
                      {m.ktpImage && (
                        <div
                          onClick={() => setLightboxImg({ url: m.ktpImage, label: m.ktpCaption })}
                          className="group relative bg-black/30 rounded-xl p-1.5 border border-white/10 cursor-pointer overflow-hidden"
                        >
                          <img
                            src={m.ktpImage}
                            alt="KTP"
                            className="rounded-lg w-full max-h-36 object-cover group-hover:scale-[1.02] transition"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-200 font-mono px-1">
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3" /> {m.ktpCaption}
                            </span>
                            <Maximize2 className="w-3 h-3 opacity-70" />
                          </div>
                        </div>
                      )}

                      {/* Optional Voice Note Player */}
                      {m.audioUrl && (
                        <div className="bg-black/30 rounded-xl p-2 border border-white/10 flex items-center justify-between gap-2">
                          <audio controls src={m.audioUrl} className="h-7 w-44" />
                          <span className="text-[10px] font-mono text-emerald-200/90 shrink-0">
                            {m.audioMeta}
                          </span>
                        </div>
                      )}

                      {/* Message Content */}
                      {m.text && <div className="leading-relaxed text-zinc-100">{m.text}</div>}
                      {m.html && (
                        <div
                          className="leading-relaxed space-y-1"
                          dangerouslySetInnerHTML={{ __html: m.html }}
                        />
                      )}

                      {/* Optional NIB Certificate Attachment from Action Agent */}
                      {m.certificateShot && (
                        <div
                          onClick={() =>
                            setLightboxImg({
                              url: m.certificateShot,
                              label: `Sertifikat Resmi ${m.nibNumber}`,
                            })
                          }
                          className="mt-2 bg-black/40 p-1.5 rounded-xl border border-emerald-500/40 cursor-pointer group"
                        >
                          <img
                            src={m.certificateShot}
                            alt="Sertifikat NIB"
                            className="rounded-lg w-full border border-white/10 group-hover:opacity-95 transition"
                          />
                          <div className="flex items-center justify-between text-[10px] text-emerald-300 mt-1.5 px-1 font-mono font-semibold">
                            <span>📄 {m.nibNumber}.png</span>
                            <span className="underline">Perbesar</span>
                          </div>
                        </div>
                      )}

                      {m.footerHint && (
                        <div className="pt-1.5 border-t border-white/10 text-[10px] text-zinc-400">
                          💡 {m.footerHint}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {(isLoading || isApproving) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-[#181f26] border border-white/10 px-3 py-2 rounded-xl w-fit"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>
                  {isApproving
                    ? 'Action Agent menjalankan Playwright di /portal...'
                    : 'Orchestrator memproses pesan suara & KTP...'}
                </span>
              </motion.div>
            )}
          </div>

          {/* Human-in-the-Loop Interrupt Drawer */}
          <AnimatePresence>
            {orchestratorStatus === 'WAITING_HUMAN_APPROVAL' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-950/90 border-t border-amber-500/50 p-3 space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Human-in-the-Loop Gate
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                    LangGraph Interrupt
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-snug">
                  Planner Agent menahan eksekusi browser sampai pengguna mengonfirmasi kebenaran data di atas:
                </p>
                <button
                  onClick={approveHumanInTheLoop}
                  disabled={isApproving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-3 rounded-xl shadow-glow-emerald flex items-center justify-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isApproving
                      ? 'Menjalankan Headless Browser Playwright...'
                      : 'Balas "SETUJU" & Jalankan Automasi Playwright'}
                  </span>
                </button>
              </motion.div>
            )}

            {/* Guardrail Multi-Turn Clarification Bar */}
            {orchestratorStatus === 'WAITING_USER_CLARIFICATION' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-950/80 border-t border-rose-500/50 p-3 space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Guardrail Aktif: Data Belum Lengkap
                  </span>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded">
                    Multi-Turn Memory
                  </span>
                </div>
                <p className="text-[11px] text-rose-100/90">
                  Ketik tambahan data di kolom chat bawah, atau klik chip balasan otomatis ini:
                </p>
                <button
                  onClick={sendFollowUpClarification}
                  disabled={isLoading}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{getClarifyQuickReplyLabel()}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* WhatsApp Chat Input Footer */}
          <div className="bg-[#14191f] p-2.5 flex items-center gap-2 border-t border-white/[0.07]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualChatSend()}
              placeholder="Ketik 'SETUJU', 'rekap buku kas', atau pesan suara..."
              className="flex-1 bg-zinc-900/90 border border-white/10 text-zinc-100 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/60"
            />
            <button
              onClick={handleManualChatSend}
              disabled={isLoading || isApproving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </div>
        </section>

        {/* ================= PANEL 2 (CENTER - 4 COLS): MULTI-AGENT ORCHESTRATOR ================= */}
        <section className="lg:col-span-4 bklit-card rounded-2xl flex flex-col overflow-hidden h-[calc(100vh-76px)] min-h-[680px]">
          <div className="px-4 py-3 bg-zinc-950/80 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <div>
                <h2 className="text-xs font-bold tracking-tight text-white uppercase">
                  LangGraph Multi-Agent Orchestrator
                </h2>
                <p className="text-[10px] text-zinc-400">
                  Real-time agent reasoning, KBLI tool lookup &amp; safety guardrails
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-emerald-300">
              {orchestratorStatus}
            </span>
          </div>

          <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
            {/* Anime.js Live Node Topology & Data Packet Flow */}
            <AgentFlowCanvas
              agent1Status={agent1.badge}
              agent2Status={agent2.badge}
              agent3Status={agent3.badge}
              orchestratorStatus={orchestratorStatus}
              intentMode={intentMode}
            />

            {/* AGENT 1 CARD: INTAKE AGENT */}
            <motion.div
              layout
              className={`bklit-subcard rounded-xl p-3.5 transition-colors ${
                agent1.badge.includes('DONE')
                  ? 'border-blue-500/40'
                  : agent1.badge.includes('RUNNING')
                  ? 'border-blue-400'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">Intake Agent (Multimodal STT + Vision)</h3>
                    <p className="text-[10px] text-zinc-400">
                      Dialek Daerah → Indonesia Formal + Ekstraksi JSON KTP
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-blue-300">
                  {agent1.badge}
                </span>
              </div>

              {agent1.data ? (
                <div className="bg-zinc-950/90 rounded-lg p-2.5 border border-white/[0.06] font-mono text-[11px] space-y-1.5 text-zinc-300">
                  <div className="flex items-center justify-between text-[10px] text-blue-300 border-b border-white/[0.06] pb-1">
                    <span>Engine: {agent1.data.ai_engine}</span>
                    <span>{agent1.data.bahasa_terdeteksi}</span>
                  </div>
                  <div className="text-zinc-400 text-[10px] italic">
                    "{agent1.data.terjemahan_formal}"
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <div className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
                      <span className="text-zinc-500 block">NIK (OCR)</span>
                      <span
                        className={
                          agent1.data.ktp_terbaca_jelas ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'
                        }
                      >
                        {agent1.data.nik || 'BURAM'}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
                      <span className="text-zinc-500 block">Pemohon</span>
                      <span className="text-white font-semibold truncate block">
                        {agent1.data.nama_lengkap || '-'}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
                      <span className="text-zinc-500 block">Usaha Mikro</span>
                      <span className="text-emerald-300 font-semibold truncate block">
                        {agent1.data.nama_usaha || '(Belum Ada)'}
                      </span>
                    </div>
                    <div className="bg-white/[0.03] px-2 py-1 rounded border border-white/[0.05]">
                      <span className="text-zinc-500 block">Modal Usaha</span>
                      <span className="text-zinc-200 font-semibold">
                        {agent1.data.modal_usaha_rp
                          ? 'Rp ' + Number(agent1.data.modal_usaha_rp).toLocaleString('id-ID')
                          : '(Kosong)'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-zinc-500 bg-zinc-950/70 rounded-lg p-2.5 border border-white/[0.05]">
                  {agent1.statusText}
                </div>
              )}
            </motion.div>

            {/* AGENT 2 CARD: PLANNER AGENT */}
            <motion.div
              layout
              className={`bklit-subcard rounded-xl p-3.5 transition-colors ${
                agent2.badge.includes('GUARDRAIL')
                  ? 'border-rose-500/60 shadow-glow-rose'
                  : agent2.badge.includes('WAITING HITL')
                  ? 'border-amber-400/70 shadow-glow-amber'
                  : agent2.badge.includes('APPROVED')
                  ? 'border-emerald-500/40'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      Planner Agent (KBLI 2020 &amp; Guardrail)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Schema Validator + Tool Lookup + Human-in-the-Loop Gate
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    agent2.badge.includes('GUARDRAIL')
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : agent2.badge.includes('WAITING')
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-white/[0.05] border-white/10 text-zinc-300'
                  }`}
                >
                  {agent2.badge}
                </span>
              </div>

              {agent2.data ? (
                <div className="bg-zinc-950/90 rounded-lg p-2.5 border border-white/[0.06] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-300">
                      KBLI {agent2.data.kbli_mapping?.kode} — {agent2.data.kbli_mapping?.judul}
                    </span>
                  </div>

                  {!agent2.data.is_complete ? (
                    <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-2 text-rose-200 font-mono text-[10px] space-y-1">
                      <div className="font-bold text-rose-300">
                        ⚠️ Eksekusi Browser Ditahan (Data Kurang):
                      </div>
                      {(agent2.data.missing_fields || []).map((m, idx) => (
                        <div key={idx}>• {m}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-zinc-400">
                      Tingkat Risiko:{' '}
                      <span className="text-emerald-400 font-semibold">
                        {agent2.data.kbli_mapping?.risiko}
                      </span>
                    </div>
                  )}

                  <div className="bg-black/40 rounded p-2 border border-white/[0.05] font-mono text-[10px] text-zinc-300 space-y-0.5">
                    {(agent2.data.execution_plan || []).map((step, i) => (
                      <div key={i}>{step}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-zinc-500 bg-zinc-950/70 rounded-lg p-2.5 border border-white/[0.05]">
                  {agent2.statusText}
                </div>
              )}
            </motion.div>

            {/* AGENT 3 CARD: ACTION AGENT */}
            <motion.div
              layout
              className={`bklit-subcard rounded-xl p-3.5 transition-colors ${
                agent3.badge.includes('COMPLETED') || agent3.badge.includes('RECOVERED')
                  ? 'border-emerald-500/50 shadow-glow-emerald'
                  : agent3.badge.includes('LEDGER') || agent3.badge.includes('ADVISOR')
                  ? 'border-cyan-500/50 shadow-glow-cyan'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      Action Agent (Playwright / HitungUang)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Headless Chromium Automation &amp; Self-Healing 503 Recovery
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-emerald-300">
                  {agent3.badge}
                </span>
              </div>

              {agent3.data && agent3.mode === 'nib' ? (
                <div className="bg-zinc-950/90 rounded-lg p-2.5 border border-white/[0.06] font-mono text-[10px] space-y-1.5">
                  <div className="text-emerald-400 font-bold text-xs flex items-center justify-between">
                    <span>NIB Terbit: {agent3.data.nib_number}</span>
                    {agent3.data.recovered_from_503 && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                        Auto-Recovered 503
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {(agent3.data.action_steps || []).map((s, idx) => (
                      <div key={idx} className="border-b border-white/[0.05] pb-1">
                        <span
                          className={
                            s.status === 'ERROR_503'
                              ? 'text-rose-400 font-bold'
                              : s.status === 'RETRYING'
                              ? 'text-amber-300 font-bold'
                              : 'text-emerald-300 font-bold'
                          }
                        >
                          [{s.status}]
                        </span>{' '}
                        <code className="text-zinc-200">{s.cmd}</code>
                        <div className="text-zinc-400">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : agent3.data && agent3.mode === 'cashflow' ? (
                <div className="bg-zinc-950/90 rounded-lg p-2.5 border border-cyan-500/30 font-mono text-[11px] space-y-1">
                  <div className="text-cyan-300 font-bold">
                    Buku Kas Diperbarui ({agent3.data.txCount} Transaksi)
                  </div>
                  <div className="text-zinc-300">
                    • Laba Bersih: Rp{' '}
                    {Number(agent3.data.summary?.laba_bersih || 0).toLocaleString('id-ID')} (Margin{' '}
                    {agent3.data.summary?.margin_persen || 0}%)
                  </div>
                </div>
              ) : agent3.data && agent3.mode === 'advisor' ? (
                <div className="bg-zinc-950/90 rounded-lg p-2.5 border border-violet-500/30 font-mono text-[11px] space-y-1">
                  <div className="text-violet-300 font-bold">Rekomendasi AI Advisor Aktif</div>
                  <div className="text-zinc-300">
                    • HPP / Unit: Rp{' '}
                    {Number(agent3.data.analisis_hpp?.hpp_per_unit || 0).toLocaleString('id-ID')}
                  </div>
                  <div className="text-emerald-300">• Status: SIAP HALAL SEHATI &amp; KUR MIKRO</div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-zinc-500 bg-zinc-950/70 rounded-lg p-2.5 border border-white/[0.05]">
                  {agent3.statusText}
                </div>
              )}
            </motion.div>

            {/* REAL-TIME EXECUTION TRACE LOGS */}
            <div className="bklit-subcard rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Telemetry Trace Log
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{traceLogs.length} events</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto text-[10px] font-mono">
                {traceLogs.length === 0 ? (
                  <div className="text-zinc-500 italic py-2">Belum ada aktivitas terekam.</div>
                ) : (
                  traceLogs.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-950/90 border border-white/[0.05] rounded-lg px-2.5 py-1.5"
                    >
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          <strong>{t.agent}</strong> • {t.step}
                        </span>
                        <span className="text-zinc-500">
                          {t.timestamp} ({t.duration_sec}s)
                        </span>
                      </div>
                      <div className="text-zinc-300 mt-0.5 font-sans text-[11px]">{t.detail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= PANEL 3 (RIGHT - 4 COLS): LIVE PLAYWRIGHT & ADVISOR OUTPUT ================= */}
        <section className="lg:col-span-4 bklit-card rounded-2xl flex flex-col overflow-hidden h-[calc(100vh-76px)] min-h-[680px]">
          {/* Segmented Control Tabs with Motion Pill */}
          <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-white/[0.07] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/[0.06]">
              {[
                { id: 'shots', label: 'Bukti Playwright', icon: Camera },
                { id: 'advisor', label: 'Buku Kas & Advisor', icon: Wallet },
                { id: 'portal', label: 'Portal Live', icon: Globe },
              ].map((t) => {
                const Icon = t.icon;
                const active = rightTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setRightTab(t.id)}
                    className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="rightTabPill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-white/[0.09] border border-white/15"
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 relative z-10 text-emerald-400" />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <a
              href="/portal"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-mono text-zinc-400 hover:text-emerald-300 flex items-center gap-1 transition shrink-0"
            >
              <span>/portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* TAB 1: PLAYWRIGHT SCREENSHOTS */}
          {rightTab === 'shots' && (
            <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
              {screenshots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">
                    Headless Chromium (Playwright) Standby
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                    Saat pengguna membalas <code className="text-emerald-300">SETUJU</code> pada
                    interupsi Human-in-the-Loop, Action Agent akan membuka{' '}
                    <code className="text-zinc-300">/portal</code>, mengisi formulir 3 tahap, dan
                    menampilkan bukti screenshot real-time di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {screenshots.map((shot, idx) => {
                    const is503 = shot.label.includes('503');
                    return (
                      <motion.div
                        key={shot.url + idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        onClick={() => setLightboxImg(shot)}
                        className={`group bklit-subcard rounded-xl overflow-hidden cursor-pointer transition ${
                          is503 ? 'border-rose-500/60' : 'hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="px-3 py-2 bg-zinc-950 border-b border-white/[0.06] flex items-center justify-between text-xs">
                          <span
                            className={`font-semibold text-[11px] ${
                              is503 ? 'text-rose-400' : 'text-emerald-300'
                            }`}
                          >
                            {shot.label}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                            Step #{idx + 1} <Maximize2 className="w-3 h-3" />
                          </span>
                        </div>
                        <img
                          src={shot.url}
                          alt={shot.label}
                          className="w-full object-contain max-h-64 bg-zinc-950 group-hover:scale-[1.01] transition"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUKU KAS UMKM & AI BUSINESS ADVISOR */}
          {rightTab === 'advisor' && (
            <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
              {!cashflowData && !consultData ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">
                    Buku Kas Suara &amp; AI Business Advisor
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-xs mb-4 leading-relaxed">
                    Retensi harian pasca-NIB: pelaku UMKM cukup kirim voice note transaksi harian
                    untuk rekap laba bersih otomatis dan konsultasi HPP/KUR.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runScenario('catat_kas')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition"
                    >
                      Coba Catat Kas
                    </button>
                    <button
                      onClick={() => runScenario('konsultasi_usaha')}
                      className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 text-xs font-semibold transition"
                    >
                      Coba Konsultasi AI
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {cashflowData && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bklit-subcard rounded-xl p-3.5 space-y-3 border-cyan-500/30"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.07] pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-cyan-300">
                            Buku Kas UMKM (HitungUang Engine)
                          </h3>
                          <p className="text-[10px] text-zinc-400">
                            Ekstraksi Multi-Transaksi Suara &amp; Teks Real-Time
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          Margin {cashflowData.summary?.margin_persen || 0}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">Pemasukan</div>
                          <div className="font-mono text-xs font-bold text-emerald-400">
                            Rp {Number(cashflowData.summary?.total_pemasukan || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">Pengeluaran</div>
                          <div className="font-mono text-xs font-bold text-rose-400">
                            Rp {Number(cashflowData.summary?.total_pengeluaran || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">Laba Bersih</div>
                          <div className="font-mono text-xs font-bold text-cyan-300">
                            Rp {Number(cashflowData.summary?.laba_bersih || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto max-h-44 overflow-y-auto border border-white/[0.06] rounded-lg">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-zinc-950 text-[10px] font-mono text-zinc-400 uppercase border-b border-white/[0.06]">
                              <th className="py-1.5 px-2.5">Item</th>
                              <th className="py-1.5 px-2">Kategori</th>
                              <th className="py-1.5 px-2.5 text-right">Nominal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(cashflowData.ledger || []).map((tx, idx) => (
                              <tr key={idx} className="border-b border-white/[0.04]">
                                <td className="py-1.5 px-2.5 text-zinc-200 font-medium">{tx.item}</td>
                                <td className="py-1.5 px-2">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-300">
                                    {tx.kategori}
                                  </span>
                                </td>
                                <td
                                  className={`py-1.5 px-2.5 text-right font-mono font-semibold ${
                                    tx.tipe === 'pemasukan'
                                      ? 'text-emerald-400'
                                      : tx.tipe === 'tabungan'
                                      ? 'text-cyan-300'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {tx.tipe === 'pemasukan' ? '+' : tx.tipe === 'tabungan' ? '🏦 ' : '-'}
                                  Rp {Number(tx.harga || 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {consultData && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bklit-subcard rounded-xl p-3.5 space-y-3 border-violet-500/40"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.07] pb-2">
                        <div className="flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-violet-400" />
                          <h3 className="text-xs font-bold text-violet-300">
                            AI Business Advisor (HPP &amp; Pertumbuhan)
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300">
                          KBLI + Ledger Context
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">HPP / Unit</div>
                          <div className="font-mono text-xs font-bold text-amber-300">
                            Rp{' '}
                            {Number(consultData.analisis_hpp?.hpp_per_unit || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">Untung / Unit</div>
                          <div className="font-mono text-xs font-bold text-emerald-400">
                            +Rp{' '}
                            {Number(consultData.analisis_hpp?.laba_per_unit || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="bg-zinc-950/90 border border-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-zinc-400">Bundling 3 Pcs</div>
                          <div className="font-mono text-xs font-bold text-cyan-300">
                            Rp{' '}
                            {Number(
                              consultData.analisis_hpp?.rekomendasi_bundling_3pcs || 0
                            ).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-white/[0.06] space-y-1.5">
                        {(consultData.rekomendasi_aksi || []).map((aksi, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-zinc-200 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatWaMarkdown(aksi) }}
                          />
                        ))}
                      </div>

                      {consultData.copywriting_wa_story && (
                        <div className="bg-zinc-950 rounded-xl p-2.5 border border-emerald-500/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-emerald-300">
                              📢 Copywriting Status WA Siap Sebar
                            </span>
                            <button
                              onClick={() => copyWaStory(consultData.copywriting_wa_story)}
                              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200"
                            >
                              {copiedWa ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" /> Disalin
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Salin Teks
                                </>
                              )}
                            </button>
                          </div>
                          <div
                            className="text-[11px] text-zinc-300 italic leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: formatWaMarkdown(consultData.copywriting_wa_story),
                            }}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: EMBEDDED TARGET PORTAL */}
          {rightTab === 'portal' && (
            <div className="flex-1 flex flex-col bg-zinc-950">
              <iframe
                src="/portal"
                title="Portal SatuNIB Target"
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          )}
        </section>
      </main>

      {/* ================= LIGHTBOX IMAGE ZOOM MODAL ================= */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bklit-card rounded-2xl max-w-4xl w-full overflow-hidden border border-white/15"
            >
              <div className="px-4 py-3 bg-zinc-950 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {lightboxImg.label}
                </span>
                <button
                  onClick={() => setLightboxImg(null)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-zinc-950 flex justify-center">
                <img
                  src={lightboxImg.url}
                  alt={lightboxImg.label}
                  className="max-h-[78vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= CUSTOM VOICE & KTP UPLOAD MODAL ================= */}
      <AnimatePresence>
        {customModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 12, opacity: 0 }}
              className="bklit-card rounded-2xl max-w-lg w-full p-5 space-y-4 border border-white/15"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Kirim Voice Note (Mikrofon) &amp; Foto KTP Kustom
                  </h3>
                </div>
                <button
                  onClick={() => setCustomModalOpen(false)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1.5">
                    1. Rekam Suara via Mikrofon atau Ketik Transkrip Bahasa Daerah/Indonesia
                  </label>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMicRecording}
                        className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                          isRecordingMic
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/10'
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isRecordingMic ? 'Berhenti Merekam' : 'Mulai Rekam Suara'}</span>
                      </button>
                      <span className="text-[11px] font-mono text-zinc-400">{micStatus}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomVoiceText(
                          'Punten Teh, abdi Pak Wahyu ti Desa Cibodas bade daftar NIB usaha Bengkel Motor Wahyu Jaya, modalna 15 juta'
                        )
                      }
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline"
                    >
                      + Isi Contoh Suara
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={customVoiceText}
                    onChange={(e) => setCustomVoiceText(e.target.value)}
                    placeholder="Contoh: Punten Teh, abdi Ibu Sari ti Desa Sukamaju bade daftar NIB usaha Keripik Singkong Berkah, modalna 5 juta..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1.5">
                    2. Upload Foto KTP Simulasi (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCustomKtpFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-300 bg-zinc-950 border border-white/10 rounded-xl p-2"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Kosongkan untuk memakai sample KTP sintetis. Jangan gunakan KTP asli pribadi.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={submitCustomModal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Kirim ke Intake Agent &rarr;
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
