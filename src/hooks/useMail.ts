import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MailFolder = 'INBOX' | 'SENT' | 'STARRED';

export interface MailMessage {
  id: string;
  folder: string;
  uid: number | null;
  from_addr: string | null;
  from_name: string | null;
  to_addrs: Array<{ address: string; name?: string }>;
  subject: string | null;
  preview: string | null;
  body_text: string | null;
  body_html: string | null;
  has_attachments: boolean;
  is_read: boolean;
  is_starred: boolean;
  is_sent: boolean;
  internal_date: string | null;
}

export function useMail(folder: MailFolder) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const messagesQuery = useQuery({
    queryKey: ['mail', folder],
    queryFn: async (): Promise<MailMessage[]> => {
      let q = supabase
        .from('mail_messages')
        .select('*')
        .order('internal_date', { ascending: false })
        .limit(200);
      if (folder === 'INBOX') q = q.eq('folder', 'INBOX');
      if (folder === 'SENT') q = q.eq('folder', 'SENT');
      if (folder === 'STARRED') q = q.eq('is_starred', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MailMessage[];
    },
    refetchInterval: 60_000,
  });

  const unreadQuery = useQuery({
    queryKey: ['mail-unread'],
    queryFn: async () => {
      const { count } = await supabase
        .from('mail_messages')
        .select('id', { count: 'exact', head: true })
        .eq('folder', 'INBOX')
        .eq('is_read', false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('mail-sync', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mail'] });
      qc.invalidateQueries({ queryKey: ['mail-unread'] });
      toast({ title: 'تمت المزامنة', description: `تم استلام ${data?.imported ?? 0} رسالة جديدة` });
    },
    onError: (e: Error) => toast({ title: 'فشل المزامنة', description: e.message, variant: 'destructive' }),
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { to: string; subject: string; text?: string; html?: string; cc?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('mail-send', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail'] });
      toast({ title: 'تم الإرسال', description: 'تم إرسال الرسالة بنجاح' });
    },
    onError: (e: Error) => toast({ title: 'فشل الإرسال', description: e.message, variant: 'destructive' }),
  });

  const updateFlags = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<MailMessage, 'is_read' | 'is_starred'>> }) => {
      const { error } = await supabase.from('mail_messages').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail'] });
      qc.invalidateQueries({ queryKey: ['mail-unread'] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mail_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail'] }),
  });

  const fetchBody = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('mail-fetch-body', {
        body: { messageId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { body_text: string | null; body_html: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail'] }),
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    unreadCount: unreadQuery.data ?? 0,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    send: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    markRead: (id: string, read = true) => updateFlags.mutate({ id, patch: { is_read: read } }),
    toggleStar: (id: string, starred: boolean) => updateFlags.mutate({ id, patch: { is_starred: !starred } }),
    remove: (id: string) => deleteMessage.mutate(id),
    fetchBody: fetchBody.mutateAsync,
    isFetchingBody: fetchBody.isPending,
  };
}