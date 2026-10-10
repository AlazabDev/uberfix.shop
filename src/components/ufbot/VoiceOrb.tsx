import { useEffect, useRef, type RefObject } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'preparing' | 'speaking' | 'error';

/** Audio-reactive canvas: no decorative animation pretending to be microphone input. */
export function VoiceOrb({ state, analyserRef }: {
  state: VoiceState; analyserRef: RefObject<AnalyserNode | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let amplitude = 0;
    const samples = new Uint8Array(128);
    const size = 480;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    ctx.scale(ratio, ratio);
    const colors = getComputedStyle(canvas);
    const gold = colors.getPropertyValue('--voice-gold').trim();
    const blue = colors.getPropertyValue('--voice-blue').trim();
    const light = colors.getPropertyValue('--voice-light').trim();
    const draw = (time: number) => {
      const active = stateRef.current === 'speaking' || stateRef.current === 'listening';
      const analyser = analyserRef.current;
      let level = 0;
      if (analyser && active) {
        analyser.getByteFrequencyData(samples);
        level = samples.reduce((sum, value) => sum + value, 0) / (samples.length * 255);
      }
      amplitude += (level - amplitude) * 0.18;
      const t = reduced.matches ? 0 : time / 1000;
      ctx.clearRect(0, 0, size, size);
      const radius = 124 + amplitude * 56 + (reduced.matches ? 0 : Math.sin(t * 1.3) * 3);
      const gradient = ctx.createRadialGradient(208, 194, 8, 240, 240, radius + 30);
      gradient.addColorStop(0, light);
      gradient.addColorStop(0.35, stateRef.current === 'listening' ? blue : gold);
      gradient.addColorStop(0.76, blue);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.23;
      ctx.beginPath(); ctx.arc(240, 240, radius + 30, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      for (let ring = 0; ring < 48; ring++) {
        ctx.beginPath();
        const latitude = (ring / 47) * Math.PI;
        const ringRadius = Math.sin(latitude) * radius;
        const y = Math.cos(latitude) * radius * 0.82;
        for (let segment = 0; segment <= 150; segment++) {
          const angle = segment / 150 * Math.PI * 2;
          const wave = Math.sin(angle * 5 + t * 1.6 + ring * 0.25) * (4 + amplitude * 29);
          const x = 240 + Math.cos(angle) * (ringRadius + wave);
          const py = 240 + y + Math.sin(angle) * ringRadius * 0.3 + Math.cos(angle * 3 + t + ring * 0.13) * (5 + amplitude * 16);
          if (segment === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = ring < 22 ? gold : blue;
        ctx.globalAlpha = 0.28 + Math.sin(latitude) * 0.4;
        ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (stateRef.current === 'thinking' || stateRef.current === 'preparing') {
        ctx.strokeStyle = gold; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(240, 240, 177, t * 1.8, t * 1.8 + 1.3); ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyserRef]);
  return <canvas ref={canvasRef} className="voice-orb" aria-hidden="true" data-voice-state={state} />;
}