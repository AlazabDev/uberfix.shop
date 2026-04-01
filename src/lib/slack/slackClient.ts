// lib/slack/slackClient.ts - محدث مع دعم external_select والتحقق من التوقيع

import crypto from 'crypto';

interface SlackMessageOptions {
  channelId: string;
  text: string;
  callbackId: string;
  actions?: Array<{
    name: string;
    text: string;
    type: 'button' | 'static_select' | 'external_select';
    value?: string;
    options?: Array<{ text: string; value: string }>;
    optionsUrl?: string; // URL للـ external_select
    minQueryLength?: number;
    actionId?: string; // لـ Slack Block Kit
  }>;
}

interface SlackRequestSignature {
  timestamp: string;
  signature: string;
}

export class SlackClient {
  private webhookUrl: string;
  private signingSecret: string;
  private requestTimeout: number = 3000;

  constructor(webhookUrl: string, signingSecret?: string) {
    this.webhookUrl = webhookUrl;
    this.signingSecret = signingSecret || '';
  }

  /**
   * التحقق من توقيع Slack Request
   * يجب استخدام هذا قبل معالجة أي webhook من Slack
   */
  verifySlackRequest(
    timestamp: string,
    signature: string,
    body: string
  ): boolean {
    // التحقق من أن الـ timestamp ليس قديماً (في الآخر 5 دقائق)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);

    if (Math.abs(currentTime - requestTime) > 300) {
      console.warn('⚠️ Slack request timestamp is too old');
      return false;
    }

    // حساب التوقيع المتوقع
    const baseString = `v0:${timestamp}:${body}`;
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', this.signingSecret)
      .update(baseString)
      .digest('hex')}`;

    // مقارنة آمنة للتوقيع (تجنب timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('❌ Invalid Slack request signature');
      return false;
    }

    console.log('✅ Valid Slack request signature');
    return true;
  }

  /**
   * إرسال رسالة تفاعلية مع Slack Blocks
   */
  async sendInteractiveMessage(options: SlackMessageOptions) {
    try {
      const blocks = this.buildMessageBlocks(options);

      const payload = {
        blocks,
        text: options.text, // Fallback text
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.requestTimeout),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send Slack message: ${response.status} ${response.statusText}`
        );
      }

      console.log('✅ Message sent successfully to Slack');
      return { success: true, data: payload };
    } catch (error) {
      console.error('❌ Error sending Slack message:', error);
      throw error;
    }
  }

  /**
   * بناء Slack Block Kit blocks
   */
  private buildMessageBlocks(options: SlackMessageOptions) {
    const blocks: any[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: options.text,
        },
      },
    ];

    if (options.actions && options.actions.length > 0) {
      const actionElements = options.actions
        .map((action) => this.buildActionElement(action))
        .filter(Boolean);

      if (actionElements.length > 0) {
        blocks.push({
          type: 'actions',
          block_id: options.callbackId,
          elements: actionElements,
        });
      }
    }

    return blocks;
  }

  /**
   * بناء عنصر تفاعلي واحد
   */
  private buildActionElement(action: SlackMessageOptions['actions'][0]) {
    switch (action.type) {
      case 'button':
        return {
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.text,
            emoji: true,
          },
          value: action.value || action.name,
          action_id: action.actionId || action.name,
        };

      case 'static_select':
        return {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: action.text,
            emoji: true,
          },
          options: action.options?.map((opt) => ({
            text: {
              type: 'plain_text',
              text: opt.text,
              emoji: true,
            },
            value: opt.value,
          })),
          action_id: action.actionId || action.name,
        };

      case 'external_select':
        return {
          type: 'external_select',
          placeholder: {
            type: 'plain_text',
            text: action.text,
            emoji: true,
          },
          action_id: action.actionId || action.name,
          min_query_length: action.minQueryLength || 0,
        };

      default:
        return null;
    }
  }

  /**
   * معالج webhook متقدم مع الدعم الكامل
   */
  async handleWebhook(
    timestamp: string,
    signature: string,
    body: string
  ): Promise<{
    success: boolean;
    type: string;
    data?: any;
    error?: string;
  }> {
    // 1. التحقق من التوقيع
    if (!this.verifySlackRequest(timestamp, signature, body)) {
      return {
        success: false,
        type: 'verification_failed',
        error: 'Invalid signature',
      };
    }

    try {
      const payload = JSON.parse(body);

      // 2. معالجة URL verification
      if (payload.type === 'url_verification') {
        return {
          success: true,
          type: 'url_verification',
          data: { challenge: payload.challenge },
        };
      }

      // 3. معالجة events
      if (payload.type === 'event_callback') {
        const event = payload.event;
        console.log(`📨 Event received: ${event.type}`);

        return {
          success: true,
          type: 'event',
          data: event,
        };
      }

      // 4. معالجة interactions (buttons, select menus, etc.)
      if (payload.type === 'block_actions') {
        console.log(`🔘 Block action received: ${payload.actions[0].action_id}`);

        return {
          success: true,
          type: 'block_action',
          data: {
            action_id: payload.actions[0].action_id,
            value: payload.actions[0].value,
            selected_option: payload.actions[0].selected_option,
            user: payload.user,
            team: payload.team,
          },
        };
      }

      return {
        success: true,
        type: 'unknown',
        data: payload,
      };
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return {
        success: false,
        type: 'processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * معالج endpoints الخارجية (external_select)
   */
  async handleExternalSelectRequest(query: string): Promise<any[]> {
    // هذا يجب أن يتم استدعاؤه من Edge Function
    // Returns options for external_select based on query
    return [
      {
        text: {
          type: 'plain_text',
          text: `Option matching "${query}"`,
        },
        value: `option_${query}`,
      },
    ];
  }
}

export default SlackClient;
