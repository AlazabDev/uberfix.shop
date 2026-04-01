// lib/slack/slackClient.ts
interface SlackMessageOptions {
    channelId: string;
    text: string;
    callbackId: string;
    actions?: Array<{
        name: string;
        text: string;
        type: 'button' | 'select';
        value?: string;
        options?: Array<{ text: string; value: string }>;
    }>;
}

export class SlackClient {
    private webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    async sendInteractiveMessage(options: SlackMessageOptions) {
        const blocks: any[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: options.text
                }
            }
        ];

        // إضافة أزرار تفاعلية
        if (options.actions && options.actions.length > 0) {
            const actionElements = options.actions.map(action => {
                if (action.type === 'button') {
                    return {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: action.text
                        },
                        value: action.value || action.name,
                        action_id: action.name
                    };
                } else if (action.type === 'select') {
                    return {
                        type: 'static_select',
                        placeholder: {
                            type: 'plain_text',
                            text: action.text
                        },
                        options: action.options?.map(opt => ({
                            text: {
                                type: 'plain_text',
                                text: opt.text
                            },
                            value: opt.value
                        })),
                        action_id: action.name
                    };
                }
                return null;
            }).filter(Boolean);

            blocks.push({
                type: 'actions',
                block_id: options.callbackId, // استخدام callback_id كـ block_id
                elements: actionElements
            });
        }

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                blocks,
                text: options.text // Fallback text
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send Slack message');
        }

        return response;
    }
}