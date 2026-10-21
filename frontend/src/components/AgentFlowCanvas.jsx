import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Cpu, ShieldCheck, Globe, Smartphone, Sparkles, AlertTriangle, Lock } from 'lucide-react';

export default function AgentFlowCanvas({
  agent1Status = 'STANDBY',
  agent2Status = 'STANDBY',
  agent3Status = 'LOCKED (HITL)',
  orchestratorStatus = 'IDLE / READY',
  intentMode = 'nib_registration',
}) {
  const svgRef = useRef(null);
  const packet1Ref = useRef(null);
  const packet2Ref = useRef(null);
  const packet3Ref = useRef(null);
  const pulseRingRef = useRef(null);

  const isRunning1 = agent1Status.includes('RUNNING');
  const isDone1 = agent1Status.includes('DONE');

  const isRunning2 = agent2Status.includes('RUNNING');
  const isStop2 = agent2Status.includes('GUARDRAIL');
  const isWaitingHitl = agent2Status.includes('WAITING HITL');
  const isDone2 = agent2Status.includes('APPROVED') || isWaitingHitl;

  const isRunning3 = agent3Status.includes('EXECUTING');
  const isDone3 =
    agent3Status.includes('COMPLETED') ||
    agent3Status.includes('RECOVERED') ||
    agent3Status.includes('LEDGER') ||
    agent3Status.includes('ADVISOR');

  useEffect(() => {
    anime.remove(['.flow-line-active', packet1Ref.current, packet2Ref.current, packet3Ref.current]);

    // Animate SVG dashed lines continuously with anime.js
    anime({
      targets: '.flow-line-active',
      strokeDashoffset: [anime.setDashoffset, 0],
      easing: 'linear',
      duration: 1600,
      loop: true,
    });

    // Packet 1: WA -> Intake Agent -> Planner Agent
    if (packet1Ref.current && (isRunning1 || isDone1)) {
      anime({
        targets: packet1Ref.current,
        translateX: [0, 108],
        opacity: [
          { value: 1, duration: 150 },
          { value: 1, duration: 700 },
          { value: 0, duration: 200 },
        ],
        easing: 'easeInOutQuad',
        duration: 1100,
        loop: true,
      });
    }

    // Packet 2: Intake -> Planner
    if (packet2Ref.current && (isRunning2 || isDone1)) {
      anime({
        targets: packet2Ref.current,
        translateX: [0, 108],
        opacity: [
          { value: 1, duration: 150 },
          { value: 1, duration: 700 },
          { value: 0, duration: 200 },
        ],
        easing: 'easeInOutQuad',
        duration: 1100,
        delay: 320,
        loop: true,
      });
    }

    // Packet 3: Planner -> Action Agent (only when HITL approved or executing/completed)
    if (packet3Ref.current && (isRunning3 || isDone3)) {
      anime({
        targets: packet3Ref.current,
        translateX: [0, 108],
        opacity: [
          { value: 1, duration: 150 },
          { value: 1, duration: 700 },
          { value: 0, duration: 200 },
        ],
        easing: 'easeInOutQuad',
        duration: 1050,
        delay: 180,
        loop: true,
      });
    }
  }, [agent1Status, agent2Status, agent3Status, isRunning1, isDone1, isRunning2, isRunning3, isDone3]);

  useEffect(() => {
    if (!pulseRingRef.current) return;
    anime.remove(pulseRingRef.current);
    anime({
      targets: pulseRingRef.current,
      scale: [0.95, 1.28],
      opacity: [0.75, 0],
      easing: 'easeOutSine',
      duration: 1500,
      loop: true,
    });
  }, [orchestratorStatus]);

  const getNodeTheme = (stage) => {
    if (stage === 1) {
      if (isRunning1) return 'border-blue-400 bg-blue-500/15 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
      if (isDone1) return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
      return 'border-white/10 bg-zinc-900/90 text-zinc-400';
    }
    if (stage === 2) {
      if (isStop2) return 'border-rose-500/70 bg-rose-500/15 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.28)]';
      if (isWaitingHitl) return 'border-amber-400/80 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
      if (isDone2) return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
      return 'border-white/10 bg-zinc-900/90 text-zinc-400';
    }
    if (stage === 3) {
      if (isRunning3) return 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.4)]';
      if (isDone3) return 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300';
      return 'border-white/10 bg-zinc-900/90 text-zinc-500';
    }
    return 'border-white/10 bg-zinc-900/90 text-zinc-400';
  };

  return (
    <div className="bklit-subcard rounded-xl p-3 relative overflow-hidden">
      {/* Subtle top ambient light */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-emerald-500/10 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              ref={pulseRingRef}
              className={`absolute inline-flex h-full w-full rounded-full ${
                orchestratorStatus.includes('WAITING')
                  ? 'bg-amber-400'
                  : orchestratorStatus.includes('IDLE')
                  ? 'bg-zinc-500'
                  : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                orchestratorStatus.includes('WAITING')
                  ? 'bg-amber-400'
                  : orchestratorStatus.includes('IDLE')
                  ? 'bg-zinc-500'
                  : 'bg-emerald-400'
              }`}
            />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            LangGraph State Topology
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300">
          {intentMode === 'cashflow_record' || intentMode === 'cashflow_query'
            ? 'MODE: HITUNGUANG LEDGER'
            : intentMode === 'business_consultation'
            ? 'MODE: AI ADVISOR'
            : 'MODE: NIB BRIDGE'}
        </span>
      </div>

      {/* Node Topology Grid */}
      <div className="relative flex items-center justify-between px-1 py-2">
        {/* SVG Connection Cables Behind Nodes */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 64"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cableGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="cableGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="cableGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Base tracks */}
          <line x1="48" y1="26" x2="152" y2="26" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <line x1="156" y1="26" x2="260" y2="26" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <line x1="264" y1="26" x2="356" y2="26" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

          {/* Active animated tracks */}
          {(isRunning1 || isDone1) && (
            <line
              className="flow-line-active"
              x1="48"
              y1="26"
              x2="152"
              y2="26"
              stroke="url(#cableGrad1)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          )}
          {(isRunning2 || isDone1) && (
            <line
              className="flow-line-active"
              x1="156"
              y1="26"
              x2="260"
              y2="26"
              stroke="url(#cableGrad2)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          )}
          {(isRunning3 || isDone3) && (
            <line
              className="flow-line-active"
              x1="264"
              y1="26"
              x2="356"
              y2="26"
              stroke="url(#cableGrad3)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          )}

          {/* Anime.js Data Packets */}
          <circle ref={packet1Ref} cx="48" cy="26" r="3.5" fill="#34d399" opacity="0" />
          <circle ref={packet2Ref} cx="152" cy="26" r="3.5" fill="#60a5fa" opacity="0" />
          <circle ref={packet3Ref} cx="256" cy="26" r="3.5" fill="#10b981" opacity="0" />
        </svg>

        {/* Node 0: WA Ingress */}
        <div className="relative z-10 flex flex-col items-center gap-1 w-16">
          <div className="w-9 h-9 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium text-zinc-300">WA 2G</span>
          <span className="text-[9px] font-mono text-emerald-400">~52 KB</span>
        </div>

        {/* Node 1: Intake Agent */}
        <div className="relative z-10 flex flex-col items-center gap-1 w-20">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 ${getNodeTheme(1)}`}>
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium text-zinc-200">1. Intake</span>
          <span className="text-[9px] font-mono text-zinc-400">STT + OCR</span>
        </div>

        {/* Node 2: Planner & HITL */}
        <div className="relative z-10 flex flex-col items-center gap-1 w-20">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 ${getNodeTheme(2)}`}>
            {isStop2 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isWaitingHitl ? (
              <Lock className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <span className="text-[10px] font-medium text-zinc-200">2. Planner</span>
          <span className="text-[9px] font-mono text-zinc-400">
            {isWaitingHitl ? 'HITL Gate' : isStop2 ? 'Guardrail' : 'KBLI 2020'}
          </span>
        </div>

        {/* Node 3: Action Agent */}
        <div className="relative z-10 flex flex-col items-center gap-1 w-20">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 ${getNodeTheme(3)}`}>
            {intentMode === 'nib_registration' ? (
              <Globe className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <span className="text-[10px] font-medium text-zinc-200">3. Action</span>
          <span className="text-[9px] font-mono text-zinc-400">
            {intentMode === 'nib_registration' ? 'Playwright' : 'HitungUang'}
          </span>
        </div>
      </div>
    </div>
  );
}
