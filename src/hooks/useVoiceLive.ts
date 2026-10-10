import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceState } from '@/components/ufbot/VoiceOrb';

const RATE = 24000;
const RELAY = `wss://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ufbot-voice`;

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Live speech-to-speech with the Foundry agent via the server-side Voice Live relay. */
export function useVoiceLive(onTurn: (role: 'user' | 'assistant', text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playAtRef = useRef(0);
  const micOnRef = useRef(true);
  const replyRef = useRef('');
  const onTurnRef = useRef(onTurn); onTurnRef.current = onTurn;

  const flushAudio = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch { /* ended */ } });
    sourcesRef.current = []; playAtRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    flushAudio();
    wsRef.current?.close(); wsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    void ctxRef.current?.close(); ctxRef.current = null; analyserRef.current = null;
    setState('idle'); setTranscript(''); setReply('');
  }, [flushAudio]);

  const play = (b64: string) => {
    const ctx = ctxRef.current; if (!ctx || !gainRef.current) return;
    const bin = atob(b64); const pcm = new Int16Array(bin.length / 2);
    for (let i = 0; i < pcm.length; i++) pcm[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) << 16 >> 16;
    const buf = ctx.createBuffer(1, pcm.length, RATE); const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gainRef.current);
    const at = Math.max(ctx.currentTime, playAtRef.current); src.start(at); playAtRef.current = at + buf.duration;
    sourcesRef.current.push(src);
    src.onended = () => {
      sourcesRef.current = sourcesRef.current.filter(s => s !== src);
      if (!sourcesRef.current.length) setState(s => (s === 'speaking' ? 'listening' : s));
    };
    setState('speaking');
  };

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setError(''); setState('preparing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: RATE }); ctxRef.current = ctx;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyserRef.current = analyser;
      const gain = ctx.createGain(); gain.connect(ctx.destination); gain.connect(analyser); gainRef.current = gain;
      const mic = ctx.createMediaStreamSource(stream); mic.connect(analyser);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      const mute = ctx.createGain(); mute.gain.value = 0; mic.connect(proc); proc.connect(mute); mute.connect(ctx.destination);

      const ws = new WebSocket(RELAY); wsRef.current = ws;
      const send = (o: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(o));
      proc.onaudioprocess = e => {
        if (!micOnRef.current || ws.readyState !== WebSocket.OPEN) return;
        const f = e.inputBuffer.getChannelData(0); const pcm = new Int16Array(f.length);
        for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
        send({ type: 'input_audio_buffer.append', audio: toBase64(pcm.buffer) });
      };
      ws.onopen = () => {
        send({ type: 'session.update', session: {
          modalities: ['text', 'audio'], input_audio_format: 'pcm16', output_audio_format: 'pcm16',
          voice: { name: 'ar-EG-ShakirNeural', type: 'azure-standard' },
          input_audio_transcription: { model: 'azure-speech', language: 'ar-EG' },
          turn_detection: { type: 'azure_semantic_vad', remove_filler_words: true },
          input_audio_noise_reduction: { type: 'azure_deep_noise_suppression' },
          input_audio_echo_cancellation: { type: 'server_echo_cancellation' },
        } });
        setState('listening');
      };
      ws.onmessage = ev => {
        let m: any; try { m = JSON.parse(ev.data); } catch { return; }
        switch (m.type) {
          case 'input_audio_buffer.speech_started':
            flushAudio(); send({ type: 'response.cancel' }); setTranscript(''); setState('listening'); break;
          case 'input_audio_buffer.speech_stopped': setState('thinking'); break;
          case 'conversation.item.input_audio_transcription.completed':
            if (m.transcript?.trim()) { setTranscript(m.transcript); onTurnRef.current('user', m.transcript.trim()); } break;
          case 'response.created': replyRef.current = ''; setReply(''); break;
          case 'response.audio_transcript.delta': case 'response.text.delta':
            replyRef.current += m.delta ?? ''; setReply(replyRef.current); break;
          case 'response.audio.delta': if (m.delta) play(m.delta); break;
          case 'response.done':
            if (replyRef.current.trim()) onTurnRef.current('assistant', replyRef.current.trim());
            if (!sourcesRef.current.length) setState('listening'); break;
          case 'error':
            if (m.error?.code === 'response_cancel_not_active') break;
            console.error('voice live', m.error); setError(m.error?.message ? `تعذر إكمال المحادثة الصوتية: ${m.error.message}` : 'تعذر إكمال المحادثة الصوتية'); break;
        }
      };
      ws.onclose = () => { if (wsRef.current === ws) { wsRef.current = null; setState(s => (s === 'idle' ? s : 'idle')); } };
      ws.onerror = () => setError('انقطع الاتصال بخدمة الصوت');
    } catch (e) {
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'اسمح للمتصفح باستخدام الميكروفون' : 'تعذر تشغيل الميكروفون');
      disconnect(); setState('error');
    }
  }, [disconnect, flushAudio]);

  const sendText = useCallback((text: string) => {
    const ws = wsRef.current; if (!ws || ws.readyState !== WebSocket.OPEN) return;
    flushAudio();
    ws.send(JSON.stringify({ type: 'response.cancel' }));
    ws.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } }));
    ws.send(JSON.stringify({ type: 'response.create' }));
    setTranscript(text); onTurnRef.current('user', text); setState('thinking');
  }, [flushAudio]);

  const interrupt = useCallback(() => { flushAudio(); wsRef.current?.send(JSON.stringify({ type: 'response.cancel' })); setState('listening'); }, [flushAudio]);
  const toggleMic = useCallback(() => { micOnRef.current = !micOnRef.current; setMicOn(micOnRef.current); }, []);
  const setMuted = useCallback((muted: boolean) => { if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 1; }, []);

  useEffect(() => disconnect, [disconnect]);
  return { connect, disconnect, sendText, interrupt, toggleMic, setMuted, micOn, state, transcript, reply, error, analyserRef };
}
