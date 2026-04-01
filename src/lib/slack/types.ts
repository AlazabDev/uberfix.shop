// lib/slack/types.ts
export interface SlackCallback {
    id: string;
    callbackId: string;
    type: 'task' | 'project' | 'comment' | 'approval';
    targetId: string;
    userId: string;
    status: 'pending' | 'completed' | 'expired';
    createdAt: Date;
    expiresAt: Date;
}

export interface SlackInteraction {
    type: string;
    callback_id: string;
    actions: Array<{
        action_id: string;
        value: string;
    }>;
    user: {
        id: string;
        username: string;
    };
    channel: {
        id: string;
        name: string;
    };
}
