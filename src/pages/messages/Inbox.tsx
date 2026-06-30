import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Inbox as InboxIcon,
  Send,
  Star,
  Edit,
  Loader2,
  RefreshCw,
  Trash2,
  Reply,
  Paperclip,
  Mail as MailIcon,
} from 'lucide-react';
import { useMail, MailFolder, MailMessage } from '@/hooks/useMail';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const Inbox = () => {
  const [folder, setFolder] = useState<MailFolder>('INBOX');
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState({ to: '', subject: '', text: '' });

  const {
    messages, isLoading, unreadCount,
    sync, isSyncing, send, isSending,
    markRead, toggleStar, remove,
  } = useMail(folder);

  const handleSelect = (m: MailMessage) => {
    setSelected(m);
    if (!m.is_read && folder === 'INBOX') markRead(m.id, true);
  };

  const handleReply = () => {
    if (!selected) return;
    setDraft({
      to: selected.from_addr ?? '',
      subject: selected.subject?.startsWith('Re:') ? selected.subject : `Re: ${selected.subject ?? ''}`,
      text: `\n\n--- الرسالة الأصلية ---\nمن: ${selected.from_name ?? selected.from_addr}\n${selected.body_text ?? ''}`,
    });
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!draft.to || !draft.subject) return;
    await send({ to: draft.to, subject: draft.subject, text: draft.text });
    setComposeOpen(false);
    setDraft({ to: '', subject: '', text: '' });
  };

  const folders = [
    { id: 'INBOX' as MailFolder, label: 'الوارد', icon: InboxIcon, badge: unreadCount },
    { id: 'SENT' as MailFolder, label: 'المرسل', icon: Send },
    { id: 'STARRED' as MailFolder, label: 'المميزة بنجمة', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MailIcon className="h-7 w-7 text-primary" /> صندوق البريد
            </h1>
            <p className="text-muted-foreground text-sm">uf@alazab.com · Migadu</p>
          </div>
          <Button onClick={() => sync()} disabled={isSyncing} variant="outline">
            <RefreshCw className={`ml-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            مزامنة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          <Card className="lg:col-span-1 p-4">
            <Button onClick={() => { setDraft({ to: '', subject: '', text: '' }); setComposeOpen(true); }} className="w-full mb-4" size="lg">
              <Edit className="ml-2 h-5 w-5" /> رسالة جديدة
            </Button>
            <Separator className="mb-4" />
            <nav className="space-y-2">
              {folders.map(f => {
                const Icon = f.icon;
                const active = folder === f.id;
                return (
                  <Button
                    key={f.id}
                    variant={active ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => { setFolder(f.id); setSelected(null); }}
                  >
                    <Icon className="ml-2 h-5 w-5" />
                    <span className="flex-1 text-right">{f.label}</span>
                    {f.badge !== undefined && f.badge > 0 && (
                      <Badge variant="secondary" className="mr-auto">{f.badge}</Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </Card>

          <Card className="lg:col-span-1 p-0 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{folders.find(f => f.id === folder)?.label}</h2>
              <p className="text-xs text-muted-foreground">{messages.length} رسالة</p>
            </div>
            <ScrollArea className="h-[calc(100vh-310px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا توجد رسائل. اضغط "مزامنة" لجلب الرسائل من الخادم.
                </div>
              ) : (
                <ul className="divide-y">
                  {messages.map(m => {
                    const active = selected?.id === m.id;
                    return (
                      <li
                        key={m.id}
                        onClick={() => handleSelect(m)}
                        className={`p-3 cursor-pointer hover:bg-accent transition ${active ? 'bg-accent' : ''} ${!m.is_read ? 'font-semibold' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm truncate flex-1">{m.from_name || m.from_addr || 'مجهول'}</span>
                          {m.internal_date && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(m.internal_date), { addSuffix: true, locale: ar })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm truncate mt-1">{m.subject || '(بدون موضوع)'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{m.preview}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {m.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          {m.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                          {!m.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-2">
            {selected ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold">{selected.subject || '(بدون موضوع)'}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        من: <span className="font-medium text-foreground">{selected.from_name || ''}</span> &lt;{selected.from_addr}&gt;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        إلى: {selected.to_addrs?.map(a => a.address).join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => toggleStar(selected.id, selected.is_starred)}>
                        <Star className={`h-4 w-4 ${selected.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleReply}>
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { remove(selected.id); setSelected(null); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {selected.body_html ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: selected.body_html }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans">{selected.body_text}</pre>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <InboxIcon className="h-24 w-24 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">اختر رسالة لعرضها</h3>
                <p className="text-muted-foreground">اضغط على أي رسالة من القائمة</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>رسالة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="to">إلى</Label>
              <Input id="to" type="email" placeholder="recipient@example.com" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="subject">الموضوع</Label>
              <Input id="subject" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="text">الرسالة</Label>
              <Textarea id="text" rows={10} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend} disabled={isSending || !draft.to || !draft.subject}>
              {isSending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Send className="ml-2 h-4 w-4" /> إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;
