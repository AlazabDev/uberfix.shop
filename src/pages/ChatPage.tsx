import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic, Trash2, ArrowRight, Download, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

export default function ChatPage() {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { speak, stop, isSpeaking, speakingMessageId } = useTTS();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const streamChat = async (allMessages: { role: string; content: string }[]) => {
    const resp = await fetch(UFBOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: allMessages, session_id: 'fullpage' }),
    });

    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'فشل الاتصال');
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

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
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
        } catch { /* skip partial */ }
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
    const userMsg: Message = { id: Date.now().toString(), content: message, role: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const chatHistory = [...messages, userMsg]
      .filter(m => m.id !== '1')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      await streamChat(chatHistory);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
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

  const clearChat = () => {
    stop();
    setMessages([{
      id: '1',
      content: 'مرحباً! أنا عزبوت 👋\nكيف يمكنني مساعدتك؟',
      role: 'assistant',
      timestamp: new Date()
    }]);
    setShowQuickActions(true);
  };

  const exportChat = () => {
    const text = messages.map(m => {
      const time = m.timestamp.toLocaleString('ar-EG');
      const sender = m.role === 'user' ? '👤 أنت' : '🤖 عزبوت';
      return `[${time}] ${sender}:\n${m.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([`محادثة عزبوت (AzaBot) - ${new Date().toLocaleDateString('ar-EG')}\n${'='.repeat(50)}\n\n${text}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azabot-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: "تم تحميل المحادثة بنجاح" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-[#f5bf23] text-[#111] p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#111] hover:bg-[#111]/10"
            onClick={() => navigate(-1)}
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="bg-[#111] text-[#f5bf23] rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold">
            عز
          </div>
          <div>
            <h1 className="text-lg font-bold">عزبوت (AzaBot)</h1>
            <p className="text-xs opacity-75">المساعد الذكي - متصل الآن</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-[#111] hover:bg-[#111]/10" onClick={exportChat} title="تصدير المحادثة">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#111] hover:bg-[#111]/10" onClick={clearChat} title="مسح المحادثة">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => { setActiveTab('text'); setAutoSpeak(false); }}
          className={cn(
            "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            activeTab === 'text'
              ? "text-[#111] dark:text-foreground border-b-2 border-[#f5bf23] bg-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          محادثة نصية
        </button>
        <button
          onClick={() => { setActiveTab('voice'); setAutoSpeak(true); }}
          className={cn(
            "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            activeTab === 'voice'
              ? "text-[#111] dark:text-foreground border-b-2 border-[#f5bf23] bg-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mic className="h-4 w-4" />
          محادثة صوتية
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'assistant' && message.id === '1' ? (
                <div className="text-center py-8">
                  <div className="bg-[#f5bf23]/10 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-[#f5bf23]" />
                  </div>
                  <p className="font-bold text-xl mb-2">مرحباً! أنا عزبوت 👋</p>
                  <p className="text-muted-foreground">كيف يمكنني مساعدتك؟</p>
                </div>
              ) : (
                <div>
                  <div className={cn("flex", message.role === 'user' ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                      message.role === 'user'
                        ? "bg-[#f5bf23] text-[#111]"
                        : "bg-muted"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleSpeakMessage(message)}
                        className="p-1.5 rounded-full hover:bg-muted/80 transition-colors"
                        title={speakingMessageId === message.id ? "إيقاف الصوت" : "تشغيل الصوت"}
                      >
                        {speakingMessageId === message.id && isSpeaking ? (
                          <VolumeX className="h-4 w-4 text-[#f5bf23]" />
                        ) : (
                          <Volume2 className="h-4 w-4 text-muted-foreground hover:text-[#f5bf23]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Quick Actions */}
          {showQuickActions && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action)}
                  className="border border-[#f5bf23]/50 text-sm rounded-full px-4 py-2 hover:bg-[#f5bf23]/10 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-end">
              <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
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
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="اكتب رسالتك..."
            className="flex-1 rounded-full border-muted-foreground/20 bg-muted/30"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-full bg-[#f5bf23] hover:bg-[#e0ad1c] text-[#111] h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">مدعوم بالذكاء الاصطناعي - قد يخطئ أحياناً</p>
      </div>
    </div>
  );
}
