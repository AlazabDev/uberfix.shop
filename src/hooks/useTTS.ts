import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { chunkSpeechText, cleanSpeechText } from '@/lib/speechText';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    finishRef.current?.();
    finishRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPreparing(false);
    setSpeakingMessageId(null);
    analyserRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(async (text: string, messageId: string) => {
    // If already speaking this message, stop
    if (speakingMessageId === messageId) {
      stop();
      return;
    }

    stop();
    const generation = generationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPreparing(true);
    setSpeakingMessageId(messageId);

    try {
      const cleanText = cleanSpeechText(text);

      if (!cleanText) {
        stop();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      for (const chunk of chunkSpeechText(cleanText)) {
      if (generation !== generationRef.current) return;
      setIsPreparing(true);
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: chunk }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.message || detail.error || `تعذر تشغيل الصوت (${response.status})`);
      }

      const audioBlob = await response.blob();
      if (generation !== generationRef.current) return;
      if (!audioBlob.size) throw new Error('لم تُرجع خدمة الصوت تسجيلًا قابلًا للتشغيل');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      try {
        const context = new AudioContext();
        contextRef.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaElementSource(audio).connect(analyser);
        analyser.connect(context.destination);
        analyserRef.current = analyser;
        await context.resume();
        if (generation !== generationRef.current) return;
        const ended = new Promise<void>((resolve, reject) => {
          finishRef.current = resolve;
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('تعذر تشغيل التسجيل الصوتي'));
        });
        await audio.play();
        if (generation !== generationRef.current) { audio.pause(); return; }
        setIsPreparing(false);
        setIsSpeaking(true);
        await ended;
      } finally {
        URL.revokeObjectURL(audioUrl);
        if (generation === generationRef.current) {
          audioRef.current = null;
          analyserRef.current = null;
          finishRef.current = null;
          const context = contextRef.current;
          contextRef.current = null;
          if (context && context.state !== 'closed') await context.close().catch(() => {});
        }
      }
      if (generation !== generationRef.current) return;
      setIsSpeaking(false);
      }
      if (generation === generationRef.current) stop();
    } catch (error) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      console.error('TTS error:', error);
      stop();
      throw error;
    }
  }, [speakingMessageId, stop]);

  return { speak, stop, isSpeaking, isPreparing, speakingMessageId, analyserRef };
}
