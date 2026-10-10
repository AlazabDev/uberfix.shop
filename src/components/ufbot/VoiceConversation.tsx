import { useState, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, MessageSquare, X, ArrowUp, Captions, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { VoiceOrb, type VoiceState } from './VoiceOrb';

interface Props {
  open: boolean; state: VoiceState; analyserRef: RefObject<AnalyserNode | null>;
  transcript: string; reply: string; error: string; muted: boolean;
  onClose(): void; onText(): void; onMic(): void; onMute(): void; onStop(): void;
  onSend(text: string): void;
}

const labels: Record<VoiceState, string> = {
  idle: 'أنا معك، تفضّل', listening: 'أسمعك الآن', thinking: 'أراجع طلبك',
  preparing: 'أجهّز الرد الصوتي', speaking: 'أتحدث معك', error: 'تعذر إكمال المحادثة',
};

export function VoiceConversation(props: Props) {
  const [captions, setCaptions] = useState(true);
  const [draft, setDraft] = useState('');
  const busy = props.state === 'thinking' || props.state === 'preparing';
  const listening = props.state === 'listening';
  return <Dialog.Root open={props.open} onOpenChange={open => { if (!open) props.onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="voice-overlay fixed inset-0 z-[10000]" />
      <Dialog.Content dir="rtl" aria-describedby={undefined} className="voice-room fixed inset-0 z-[10001] flex flex-col overflow-hidden focus:outline-none sm:inset-5 sm:rounded-lg">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/20 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="voice-mark flex h-10 w-10 items-center justify-center rounded-full"><Mic className="h-5 w-5" /></span>
            <div><Dialog.Title className="text-lg font-bold" dir="ltr">UF.Bot</Dialog.Title><p className="text-xs opacity-60">أوبرفيكس · محادثة صوتية</p></div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="voice-icon" onClick={props.onText} aria-label="المحادثة النصية" title="المحادثة النصية"><MessageSquare /></Button>
            <Button variant="ghost" size="icon" className="voice-icon" onClick={props.onClose} aria-label="إغلاق المحادثة الصوتية" title="إغلاق"><X /></Button>
          </div>
        </header>
        <main className="voice-main flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 text-center">
          <div className="voice-heading"><p className="voice-eyebrow text-xs">مساعدك في أوبرفيكس</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl" dir="ltr">UF.Bot</h2></div>
          <div className="voice-orb-stage"><VoiceOrb state={props.state} analyserRef={props.analyserRef} /></div>
          <div className="flex min-h-7 items-center gap-2 text-sm" role="status" aria-live="polite">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className={cn('voice-status-dot', listening && 'animate-pulse')} />}
            {labels[props.state]}
          </div>
          <div className="voice-caption mt-4 w-full max-w-2xl" aria-live="polite">
            {props.error ? <p className="voice-error text-sm" role="alert">{props.error}</p> : captions && <>
              {props.transcript && <p className="mb-2 text-sm opacity-60">{props.transcript}</p>}
              <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-base leading-relaxed">{props.reply || 'كيف يمكنني مساعدتك اليوم؟'}</p>
            </>}
          </div>
          {!props.transcript && !props.reply && <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {['تقديم طلب صيانة', 'استعلام طلب صيانة', 'إبلاغ عن شكوى'].map(text => <Button key={text} variant="link" className="voice-prompt text-xs" disabled={busy || listening} onClick={() => props.onSend(text)}>{text}</Button>)}
          </div>}
        </main>
        <footer className="voice-footer shrink-0 px-5 pb-5 pt-3 sm:pb-7">
          <div className="mb-4 flex items-center justify-center gap-3 sm:gap-5">
            <Button variant="ghost" size="icon" className="voice-control" onClick={() => setCaptions(!captions)} aria-label={captions ? 'إخفاء النص' : 'إظهار النص'} aria-pressed={captions} title="النص المكتوب"><Captions /></Button>
            <Button variant="ghost" size="icon" className="voice-control" onClick={props.onMute} aria-label={props.muted ? 'تشغيل صوت الوكيل' : 'كتم صوت الوكيل'} aria-pressed={props.muted} title={props.muted ? 'تشغيل الصوت' : 'كتم الصوت'}>{props.muted ? <VolumeX /> : <Volume2 />}</Button>
            <Button variant="secondary" size="icon" className={cn('voice-mic h-16 w-16 rounded-full', listening && 'voice-mic-active')} disabled={busy} onClick={props.onMic} aria-label={listening ? 'إنهاء الكلام وإرساله' : 'بدء التحدث'} title={listening ? 'إنهاء الكلام' : 'بدء التحدث'}>{listening ? <MicOff className="!h-6 !w-6" /> : <Mic className="!h-6 !w-6" />}</Button>
            <Button variant="ghost" size="icon" className="voice-control" onClick={props.onStop} disabled={props.state === 'idle' || props.state === 'error'} aria-label="إيقاف المحادثة الحالية" title="إيقاف"><Square /></Button>
            <Button variant="destructive" size="icon" className="rounded-full" onClick={props.onClose} aria-label="إنهاء المحادثة" title="إنهاء المحادثة"><PhoneOff /></Button>
          </div>
          <form className="voice-text-input mx-auto flex w-full max-w-lg items-center gap-2 rounded-lg border px-2" onSubmit={event => { event.preventDefault(); if (draft.trim()) { props.onSend(draft.trim()); setDraft(''); } }}>
            <Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب رسالتك" aria-label="رسالة للوكيل الصوتي" disabled={busy || listening} className="border-0 bg-transparent text-current placeholder:text-current/40 focus-visible:ring-0" />
            <Button variant="ghost" size="icon" type="submit" disabled={!draft.trim() || busy || listening} className="voice-icon" aria-label="إرسال رسالة صوتية الرد" title="إرسال"><ArrowUp /></Button>
          </form>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}