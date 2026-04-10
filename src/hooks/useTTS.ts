import { useState, useRef, useCallback } from 'react';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  const speak = useCallback(async (text: string, messageId: string) => {
    // If already speaking this message, stop
    if (speakingMessageId === messageId) {
      stop();
      return;
    }

    stop();
    setIsSpeaking(true);
    setSpeakingMessageId(messageId);

    try {
      // Strip markdown for cleaner speech
      const cleanText = text
        .replace(/[#*_~`>|[\]()!-]/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) {
        stop();
        return;
      }

      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        stop();
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      stop();
      throw error;
    }
  }, [speakingMessageId, stop]);

  return { speak, stop, isSpeaking, speakingMessageId };
}
