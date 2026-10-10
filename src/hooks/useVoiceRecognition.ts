import { useCallback, useEffect, useRef, useState } from 'react';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { results: { length: number; [index: number]: RecognitionResult } }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useVoiceRecognition(onFinal: (text: string) => void, onError: (message: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<Recognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const generationRef = useRef(0);
  const callbacks = useRef({ onFinal, onError });
  callbacks.current = { onFinal, onError };
  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    analyserRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    setIsListening(false);
  }, []);
  const cancel = useCallback(() => {
    generationRef.current += 1;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.abort(); }
    release();
    setTranscript('');
  }, [release]);
  const finish = useCallback(() => recRef.current?.stop(), []);
  const start = useCallback(async () => {
    cancel();
    const generation = generationRef.current;
    const browser = window as SpeechWindow;
    const SR = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SR) {
      callbacks.current.onError('التحدث الصوتي غير مدعوم في هذا المتصفح. يمكنك استخدام كروم أو إيدج، أو متابعة المحادثة كتابةً.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (generation !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      await context.resume();
      if (generation !== generationRef.current) return;
      const rec = new SR();
      recRef.current = rec;
      rec.lang = 'ar-EG'; rec.interimResults = true; rec.continuous = false;
      let finalText = '';
      let failed = false;
      rec.onresult = event => {
        let interim = '';
        finalText = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          interim += result[0].transcript;
          if (result.isFinal) finalText += result[0].transcript;
        }
        setTranscript(interim);
      };
      rec.onerror = event => {
        failed = true;
        if (event.error !== 'aborted') callbacks.current.onError(event.error === 'no-speech'
          ? 'لم أسمع كلامًا واضحًا. يمكنك بدء التحدث مجددًا.'
          : event.error === 'not-allowed' ? 'لم يُسمح باستخدام الميكروفون. راجع إذن الميكروفون في المتصفح.'
          : 'تعذر التعرف على الكلام. تحقق من اتصالك وابدأ التحدث مجددًا.');
        release();
      };
      rec.onend = () => {
        recRef.current = null;
        release();
        if (!failed && generation === generationRef.current && finalText.trim()) callbacks.current.onFinal(finalText.trim());
      };
      rec.start(); setIsListening(true);
    } catch {
      release();
      if (generation === generationRef.current) callbacks.current.onError('تعذر تشغيل الميكروفون. تأكد من توصيله والسماح باستخدامه.');
    }
  }, [cancel, release]);
  useEffect(() => cancel, [cancel]);
  return { start, finish, cancel, transcript, isListening, analyserRef };
}