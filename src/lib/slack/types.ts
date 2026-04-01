// lib/slack/types.ts - أنواع شاملة لـ Slack

// ===== CALLBACKS =====
export interface SlackCallback {
  id: string;
  callbackId: string;
  type: 'task' | 'project' | 'comment' | 'approval' | 'external_select';
  targetId: string;
  userId: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

// ===== INTERACTIONS =====
export interface SlackInteraction {
  type: 'block_actions' | 'message_actions' | 'view_submission';
  callback_id: string;
  trigger_id: string;
  actions: SlackAction[];
  user: SlackUser;
  team: SlackTeam;
  channel?: SlackChannel;
  message?: SlackMessage;
  view?: SlackView;
  response_url?: string;
  timestamp?: number;
}

export interface SlackAction {
  type:
    | 'button'
    | 'static_select'
    | 'external_select'
    | 'datepicker'
    | 'plain_text_input';
  action_id: string;
  block_id: string;
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
  };
  value?: string;
  selected_option?: SlackOption;
  selected_options?: SlackOption[];
  selected_date?: string;
  selected_time?: string;
  selected_conversation?: string;
  selected_user?: string;
  selected_channel?: string;
}

export interface SlackOption {
  text: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
  };
  value: string;
  url?: string;
}

export interface SlackUser {
  id: string;
  username?: string;
  name?: string;
  team_id?: string;
}

export interface SlackTeam {
  id: string;
  domain?: string;
}

export interface SlackChannel {
  id: string;
  name?: string;
}

export interface SlackMessage {
  type: string;
  user?: string;
  ts: string;
  thread_ts?: string;
}

export interface SlackView {
  id: string;
  team_id: string;
  type: 'modal' | 'home' | 'workflow_step';
  blocks: any[];
  previous_view_id?: string;
  root_view_id?: string;
  app_id: string;
  external_id: string;
  state?: Record<string, any>;
  hash: string;
  title?: { type: 'plain_text'; text: string };
  clear_on_close?: boolean;
  notify_on_close?: boolean;
  metadata?: {
    event_type: string;
    event_payload: Record<string, any>;
  };
}

// ===== WEBHOOKS =====
export interface SlackWebhookPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: 'event_callback' | 'url_verification' | 'block_actions';
  event_id: string;
  event_time: number;
  authed_teams?: string[];
  authed_users?: string[];
  authorizations?: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}

export interface SlackEvent {
  type: string;
  user?: string;
  text?: string;
  ts: string;
  channel?: string;
  thread_ts?: string;
  [key: string]: any;
}

export interface SlackWebhookSignature {
  timestamp: string;
  signature: string; // v0=...
}

// ===== EXTERNAL SELECT =====
export interface ExternalSelectRequest {
  name: string; // action_id
  value: string; // current search query
}

export interface ExternalSelectResponse {
  options: SlackOption[];
  option_groups?: Array<{
    label: {
      type: 'plain_text';
      text: string;
    };
    options: SlackOption[];
  }>;
}

// ===== BLOCKS API =====
export interface SlackBlock {
  type: string;
  block_id?: string;
  [key: string]: any;
}

export interface SlackActionBlock extends SlackBlock {
  type: 'actions';
  elements: SlackActionElement[];
}

export interface SlackActionElement {
  type: string;
  action_id: string;
  text?: { type: 'plain_text'; text: string };
  value?: string;
  [key: string]: any;
}

// ===== REQUEST/RESPONSE =====
export interface SlackAPIResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    messages: string[];
    warnings?: string[];
  };
}

export interface SlackRequestMetadata {
  timestamp: string;
  signature: string;
  body: string;
}

// ===== ERROR TYPES =====
export enum SlackErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED_REQUEST = 'EXPIRED_REQUEST',
  UNKNOWN_ACTION = 'UNKNOWN_ACTION',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

export class SlackError extends Error {
  constructor(
    public code: SlackErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SlackError';
  }
}
