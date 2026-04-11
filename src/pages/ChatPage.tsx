import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Mic, Trash2, ArrowRight, Download, MessageCircle,
  Volume2, VolumeX, Paperclip, Square, Loader2, FileText, Image as ImageIcon, File as FileIcon
} from "lucide-react";
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
  attachments?: Attachment[];
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

const UFBOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ufbot`;
const SEAFILE_UPLOAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seafile-upload`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`;

const authHeaders = {
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { speak, stop, isSpeaking, speakingMessageId } = useTTS();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ─── Stream Chat ───
  const streamChat = async (allMessages: { role: string; content: string }[]) => {
    const resp = await fetch(UFBOT_URL, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
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
    const streamMsgId = `stream-${Date.now()}`;

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

    if (autoSpeak && assistantContent) {
      try { await speak(assistantContent, streamMsgId); } catch { /* TTS non-critical */ }
    }
  };

  // ─── Send Message ───
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

  // ─── TTS ───
  const handleSpeakMessage = async (message: Message) => {
    try {
      await speak(message.content, message.id);
    } catch {
      toast({ title: "خطأ", description: "فشل تشغيل الصوت", variant: "destructive" });
    }
  };

  // ─── Voice Recording (STT) ───
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        setIsProcessingVoice(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const resp = await fetch(STT_URL, { method: "POST", headers: authHeaders, body: formData });
          if (!resp.ok) throw new Error("STT failed");
          const data = await resp.json();
          const text = data.text || "";
          if (text) {
            setInput('');
            await sendMessageDirect(text);
          } else {
            toast({ title: "تنبيه", description: "لم يتم التعرف على كلام", variant: "destructive" });
          }
        } catch {
          toast({ title: "خطأ", description: "فشل تحويل الصوت لنص", variant: "destructive" });
        } finally {
          setIsProcessingVoice(false);
          setRecordingDuration(0);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch {
      toast({ title: "خطأ", description: "لا يمكن الوصول للميكروفون", variant: "destructive" });
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      chunksRef.current = [];
    }
  }, [isRecording]);

  // Direct send (used by voice)
  const sendMessageDirect = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowQuickActions(false);
    const userMsg: Message = { id: Date.now().toString(), content: text, role: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
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

  // ─── File Upload ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      toast({ title: "خطأ", description: "حجم الملف يتجاوز 25 ميجابايت", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "/chat-uploads");

      const resp = await fetch(SEAFILE_UPLOAD_URL, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();

      const attachment: Attachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: data.file_url || "",
      };

      const userMsg: Message = {
        id: Date.now().toString(),
        content: `📎 تم إرفاق ملف: ${file.name}`,
        role: 'user',
        timestamp: new Date(),
        attachments: [attachment],
      };

      setMessages(prev => [...prev, userMsg]);
      toast({ title: "تم الرفع", description: `تم رفع ${file.name} بنجاح` });
    } catch {
      toast({ title: "خطأ", description: "فشل رفع الملف", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Send Voice Note (record and upload audio as file) ───
  const sendVoiceNote = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          if (blob.size === 0) { resolve(); return; }

          setIsUploading(true);
          try {
            const fileName = `voice-note-${Date.now()}.webm`;
            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("folder", "/voice-notes");

            const resp = await fetch(SEAFILE_UPLOAD_URL, {
              method: "POST",
              headers: authHeaders,
              body: formData,
            });

            if (!resp.ok) throw new Error("Upload failed");
            const data = await resp.json();

            const userMsg: Message = {
              id: Date.now().toString(),
              content: `🎙️ ملاحظة صوتية`,
              role: 'user',
              timestamp: new Date(),
              attachments: [{
                name: fileName,
                type: "audio/webm",
                size: blob.size,
                url: data.file_url || "",
              }],
            };
            setMessages(prev => [...prev, userMsg]);
            toast({ title: "تم", description: "تم إرسال الملاحظة الصوتية" });
          } catch {
            toast({ title: "خطأ", description: "فشل إرسال الملاحظة الصوتية", variant: "destructive" });
          } finally {
            setIsUploading(false);
          }
          resolve();
        };

        mediaRecorder.start();
        // Auto-stop after 60 seconds max
        setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 60000);
      });
    } catch {
      toast({ title: "خطأ", description: "لا يمكن الوصول للميكروفون", variant: "destructive" });
    }
  }, [toast]);

  // ─── Clear & Export ───
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
      let content = `[${time}] ${sender}:\n${m.content}\n`;
      if (m.attachments?.length) {
        content += m.attachments.map(a => `  📎 ${a.name} (${formatFileSize(a.size)}) - ${a.url}`).join('\n') + '\n';
      }
      return content;
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Volume2 className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-[#f5bf23] text-[#111] p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-[#111] hover:bg-[#111]/10" onClick={() => navigate(-1)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="bg-[#111] text-[#f5bf23] rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold">عز</div>
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
            activeTab === 'text' ? "text-[#111] dark:text-foreground border-b-2 border-[#f5bf23] bg-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          محادثة نصية
        </button>
        <button
          onClick={() => { setActiveTab('voice'); setAutoSpeak(true); }}
          className={cn(
            "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            activeTab === 'voice' ? "text-[#111] dark:text-foreground border-b-2 border-[#f5bf23] bg-background" : "text-muted-foreground hover:text-foreground"
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
                      message.role === 'user' ? "bg-[#f5bf23] text-[#111]" : "bg-muted"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}

                      {/* Attachments */}
                      {message.attachments?.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs transition-colors",
                            message.role === 'user'
                              ? "bg-[#111]/10 hover:bg-[#111]/20 text-[#111]"
                              : "bg-background/50 hover:bg-background/80 text-foreground"
                          )}
                        >
                          {getFileIcon(att.type)}
                          <span className="truncate flex-1">{att.name}</span>
                          <span className="text-[10px] opacity-60">{formatFileSize(att.size)}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* TTS button for assistant messages */}
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
                <button key={i} onClick={() => sendMessage(action)} className="border border-[#f5bf23]/50 text-sm rounded-full px-4 py-2 hover:bg-[#f5bf23]/10 transition-colors">
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Loading indicator */}
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

      {/* Voice Tab: Big microphone UI */}
      {activeTab === 'voice' && (
        <div className="border-t bg-background p-6 flex flex-col items-center gap-4">
          {isProcessingVoice ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-[#f5bf23] animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">جاري تحويل الصوت...</p>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
                <Mic className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-lg font-bold font-display">{formatDuration(recordingDuration)}</p>
              <div className="flex items-center gap-4">
                <button onClick={cancelRecording} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={stopRecording} className="w-14 h-14 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg hover:bg-destructive/90">
                  <Square className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="w-16 h-16 rounded-full bg-[#f5bf23] text-[#111] flex items-center justify-center shadow-lg hover:bg-[#e0ad1c] disabled:opacity-50 transition-colors"
              >
                <Mic className="w-7 h-7" />
              </button>
              <p className="text-xs text-muted-foreground">اضغط للتحدث مع عزبوت</p>
            </div>
          )}
        </div>
      )}

      {/* Text Tab: Input bar */}
      {activeTab === 'text' && (
        <div className="border-t bg-background p-3">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-destructive/5 rounded-xl max-w-3xl mx-auto">
              <Mic className="w-4 h-4 text-destructive animate-pulse" />
              <span className="text-sm font-medium">{formatDuration(recordingDuration)}</span>
              <div className="flex-1" />
              <button onClick={cancelRecording} className="text-xs text-destructive hover:underline">إلغاء</button>
              <button onClick={stopRecording} className="text-xs bg-destructive text-white px-3 py-1 rounded-full hover:bg-destructive/90">إرسال</button>
            </div>
          )}

          {isProcessingVoice && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-muted rounded-xl max-w-3xl mx-auto">
              <Loader2 className="w-4 h-4 animate-spin text-[#f5bf23]" />
              <span className="text-sm text-muted-foreground">جاري تحويل الصوت لنص...</span>
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            {/* Main input row */}
            <div className="flex gap-2 items-center">
              {/* Send button - prominent on the right in RTL */}
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-full bg-[#f5bf23] hover:bg-[#e0ad1c] text-[#111] h-10 w-10 shrink-0 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>

              {/* Text input */}
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اكتب رسالتك..."
                className="flex-1 rounded-full border-muted-foreground/20 bg-muted/30 h-10"
                disabled={isLoading || isRecording}
              />

              {/* Tool buttons group - left side in RTL */}
              <div className="flex items-center gap-0.5 shrink-0">
                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-[#f5bf23] hover:bg-[#f5bf23]/10 h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoading}
                  title="إرفاق ملف"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>

                {/* Voice record button */}
                {!isRecording && !isProcessingVoice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground hover:text-[#f5bf23] hover:bg-[#f5bf23]/10 h-9 w-9"
                    onClick={startRecording}
                    disabled={isLoading}
                    title="تسجيل صوتي"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">مدعوم بالذكاء الاصطناعي - قد يخطئ أحياناً</p>
        </div>
      )}
    </div>
  );
}
