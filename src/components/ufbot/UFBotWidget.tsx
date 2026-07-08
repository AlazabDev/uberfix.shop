import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX, Headphones, Paperclip, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/useTTS";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachment?: { url: string; name: string; type: string };
}

const UFBOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ufbot`;

const QUICK_ACTIONS = [
  "ما هي خدمات الشركة؟",
  "أريد عرض سعر تشطيب",
  "ما هي أسعار التشطيب؟",
  "ما هي فروع الشركة؟",
];

type TabType = 'text' | 'voice';

export function UFBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'مرحباً! أنا عزبوت 👋\nكيف يمكنني مساعدتك؟',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { speak, isSpeaking, speakingMessageId } = useTTS();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop?.(); } catch { /* ignore */ }
    };
  }, []);

  const toggleVoiceRecording = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "غير مدعوم", description: "متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.", variant: "destructive" });
      return;
    }
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setIsRecording(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'ar-EG';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    rec.onend = () => {
      setIsRecording(false);
      // Auto-send if we have text and voice tab
      setTimeout(() => {
        setInput((current) => {
          if (current.trim() && activeTab === 'voice') {
            sendMessage(current);
            return '';
          }
          return current;
        });
      }, 100);
    };
    rec.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast({ title: "خطأ", description: "تعذر تشغيل الميكروفون", variant: "destructive" });
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "حجم كبير", description: "الحد الأقصى 10 ميغابايت", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `ufbot/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { contentType: file.type });
      if (error || !data) throw error;
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
      setPendingAttachment({ url: urlData.publicUrl, name: file.name, type: file.type });
      toast({ title: "تم الرفع", description: file.name });
    } catch {
      toast({ title: "فشل الرفع", description: "تعذر رفع الملف", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const streamChat = async (allMessages: { role: string; content: string }[]) => {
    const resp = await fetch(UFBOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: allMessages, session_id: 'widget' }),
    });

    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'فشل الاتصال بالمساعد الذكي');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';
    let streamMsgId = `stream-${Date.now()}`;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.id === streamMsgId) {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
              }
              return [...prev, { id: streamMsgId, content: assistantContent, role: 'assistant', timestamp: new Date() }];
            });
          }
        } catch { /* partial JSON, skip */ }
      }
    }

    // Auto-speak if voice tab is active
    if (autoSpeak && assistantContent) {
      try {
        await speak(assistantContent, streamMsgId);
      } catch { /* TTS error, non-critical */ }
    }
  };

  const sendMessage = async (text?: string) => {
    const message = (text || input).trim();
    if ((!message && !pendingAttachment) || isLoading) return;

    setShowQuickActions(false);
    const attachment = pendingAttachment;
    const userMsg: Message = {
      id: Date.now().toString(),
      content: message || (attachment ? `📎 ${attachment.name}` : ''),
      role: 'user',
      timestamp: new Date(),
      attachment: attachment || undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingAttachment(null);
    setIsLoading(true);

    const chatHistory = [...messages, userMsg]
      .filter(m => m.id !== '1')
      .map(m => ({
        role: m.role,
        content: m.attachment
          ? `${m.content}\n[مرفق: ${m.attachment.name} - ${m.attachment.url}]`
          : m.content,
      }));

    try {
      await streamChat(chatHistory);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = async (message: Message) => {
    try {
      await speak(message.content, message.id);
    } catch {
      toast({ title: "خطأ", description: "فشل تشغيل الصوت", variant: "destructive" });
    }
  };

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full shadow-lg",
          "bg-[#f5bf23] hover:bg-[#e0ad1c] text-[#111]",
          "transition-all duration-300 ease-in-out"
        )}
        size="icon"
        aria-label="عزبوت"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] w-[340px] sm:w-[380px] rounded-2xl shadow-2xl border border-border bg-[#f5f4ef] flex flex-col overflow-hidden"
          style={{ height: '560px', maxHeight: '80vh' }}
          dir="rtl"
        >
          {/* Header — dark navy */}
          <div className="bg-[#1a1b3a] text-white px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <h3 className="font-bold text-sm leading-tight">عزبوت (AzaBot)</h3>
                <p className="text-[11px] opacity-75 leading-tight">المساعد الذكي - متصل الآن</p>
              </div>
              <div className="bg-[#f5bf23] text-[#1a1b3a] rounded-full h-10 w-10 flex items-center justify-center">
                <Headphones className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Tabs — voice on the left, text on the right (RTL) */}
          <div className="flex bg-[#1a1b3a] text-white/80 border-b border-black/10">
            <button
              onClick={() => { setActiveTab('voice'); setAutoSpeak(true); }}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors relative",
                activeTab === 'voice' ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              <Mic className="h-4 w-4" />
              محادثة صوتية
              {activeTab === 'voice' && (
                <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-[#f5bf23]" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('text'); setAutoSpeak(false); }}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors relative",
                activeTab === 'text' ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              محادثة نصية
              {activeTab === 'text' && (
                <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-[#f5bf23]" />
              )}
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === 'user' ? "justify-start" : "justify-center flex-col items-center")}>
                  {message.role === 'assistant' && message.id === '1' ? (
                    <div className="text-center py-6">
                      <div className="bg-[#f5bf23]/15 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="h-8 w-8 text-[#f5bf23]" fill="currentColor" />
                      </div>
                      <p className="font-bold text-base mb-1 text-[#1a1b3a]">مرحباً! أنا عزبوت 👋</p>
                      <p className="text-sm text-muted-foreground">كيف يمكنني مساعدتك؟</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                        message.role === 'user'
                          ? "bg-[#f5bf23] text-[#111] self-start"
                          : "bg-muted self-end float-left"
                      )}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : message.content}
                      </div>
                      {message.role === 'assistant' && message.id !== '1' && (
                        <button
                          onClick={() => handleSpeakMessage(message)}
                          className="mt-1 p-1 rounded-full hover:bg-muted/80 transition-colors float-left clear-left"
                          title={speakingMessageId === message.id ? "إيقاف الصوت" : "تشغيل الصوت"}
                        >
                          {speakingMessageId === message.id && isSpeaking ? (
                            <VolumeX className="h-3.5 w-3.5 text-[#f5bf23]" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-[#f5bf23]" />
                          )}
                        </button>
                      )}
                      <div className="clear-both" />
                    </div>
                  )}
                </div>
              ))}

              {/* Quick Actions — 2-column pill grid */}
              {showQuickActions && messages.length <= 1 && (
                <div className="grid grid-cols-2 gap-2 px-1 pt-1">
                  {QUICK_ACTIONS.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action)}
                      className="border border-[#1a1b3a]/25 bg-white text-[13px] rounded-full px-3 py-2 hover:bg-[#f5bf23]/10 hover:border-[#f5bf23] transition-colors text-[#1a1b3a] text-center leading-tight"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-xl px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#f5bf23] rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-[#f5bf23] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-[#f5bf23] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-3 pt-2 pb-3 bg-[#f5f4ef] border-t border-black/5">
            {/* Pending attachment preview */}
            {pendingAttachment && (
              <div className="mb-2 flex items-center gap-2 bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-xs">
                {pendingAttachment.type.startsWith('image/') ? (
                  <ImageIcon className="h-3.5 w-3.5 text-[#1a1b3a] shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#1a1b3a] shrink-0" />
                )}
                <span className="flex-1 truncate text-[#1a1b3a]">{pendingAttachment.name}</span>
                <button
                  onClick={() => setPendingAttachment(null)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="إزالة"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="relative flex items-center bg-white rounded-full border border-black/10 shadow-sm gap-1 px-1.5 py-1">
              <Button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !pendingAttachment) || isLoading}
                size="icon"
                className="shrink-0 rounded-full bg-[#f5bf23] hover:bg-[#e0ad1c] text-[#1a1b3a] h-7 w-7 disabled:opacity-50"
                aria-label="إرسال"
              >
                <Send className="h-3.5 w-3.5 -scale-x-100" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={isRecording ? "🎤 جاري الاستماع..." : "اكتب رسالتك..."}
                className="flex-1 h-8 text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-muted-foreground/70 px-1"
                disabled={isLoading}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#1a1b3a] hover:bg-black/5 transition-colors disabled:opacity-50"
                aria-label="إرفاق ملف"
                title="إرفاق ملف"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={toggleVoiceRecording}
                disabled={isLoading}
                className={cn(
                  "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50",
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-[#1a1b3a] hover:bg-black/5"
                )}
                aria-label={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
                title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">مدعوم بالذكاء الاصطناعي - قد يخطئ أحياناً</p>
          </div>
        </div>
      )}
    </>
  );
}
