import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, MessageSquare, X, Send, Mic, Volume2, VolumeX, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/useTTS";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { speak, isSpeaking, speakingMessageId } = useTTS();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

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
    if (!message || isLoading) return;

    setShowQuickActions(false);
    const userMsg: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const chatHistory = [...messages, userMsg]
      .filter(m => m.id !== '1')
      .map(m => ({ role: m.role, content: m.content }));

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
            <div className="relative flex items-center bg-white rounded-full border border-black/10 shadow-sm">
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 rounded-full bg-[#f5bf23] hover:bg-[#e0ad1c] text-[#1a1b3a] h-8 w-8 ml-1.5 disabled:opacity-60"
                aria-label="إرسال"
              >
                <Send className="h-4 w-4 -scale-x-100" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اكتب رسالتك..."
                className="flex-1 text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-muted-foreground/70"
                disabled={isLoading}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">مدعوم بالذكاء الاصطناعي - قد يخطئ أحياناً</p>
          </div>
        </div>
      )}
    </>
  );
}
