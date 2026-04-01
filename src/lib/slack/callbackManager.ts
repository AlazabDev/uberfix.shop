// lib/slack/callbackManager.ts
import { supabase } from '../supabase';
import { SlackCallback } from './types';

export class SlackCallbackManager {
    // إنشاء Callback ID جديد
    static async create(options: {
        type: SlackCallback['type'];
        targetId: string;
        userId: string;
    }): Promise<string> {
        const callbackId = crypto.randomUUID();

        const { data, error } = await supabase
            .from('slack_callbacks')
            .insert({
                callback_id: callbackId,
                type: options.type,
                target_id: options.targetId,
                user_id: options.userId,
                status: 'pending',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return callbackId;
    }

    // التحقق من صحة Callback ID
    static async verify(callbackId: string): Promise<SlackCallback | null> {
        const { data, error } = await supabase
            .from('slack_callbacks')
            .select('*')
            .eq('callback_id', callbackId)
            .single();

        if (error || !data) return null;

        // التحقق من عدم انتهاء الصلاحية
        if (new Date(data.expires_at) < new Date()) {
            await this.markAsExpired(callbackId);
            return null;
        }

        return data;
    }

    // تحديث حالة Callback
    static async updateStatus(callbackId: string, status: SlackCallback['status']) {
        const { error } = await supabase
            .from('slack_callbacks')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('callback_id', callbackId);

        if (error) throw error;
    }

    // تعليم Callback كمنتهي الصلاحية
    static async markAsExpired(callbackId: string) {
        await this.updateStatus(callbackId, 'expired');
    }
}