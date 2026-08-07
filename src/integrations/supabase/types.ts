export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      _legacy_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          parent_message_id: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          parent_message_id?: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          parent_message_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "_legacy_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      _legacy_notification: {
        Row: {
          build_id: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          platform: string | null
          read: boolean | null
          title: string | null
          type: string | null
        }
        Insert: {
          build_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          platform?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Update: {
          build_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          platform?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      _legacy_whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string
          customer_name: string | null
          direction: string
          id: string
          media_url: string | null
          message_type: string
          phone_number: string
          status: string | null
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          customer_name?: string | null
          direction: string
          id?: string
          media_url?: string | null
          message_type?: string
          phone_number: string
          status?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          customer_name?: string | null
          direction?: string
          id?: string
          media_url?: string | null
          message_type?: string
          phone_number?: string
          status?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
      ai_sessions: {
        Row: {
          channel: string
          completion_tokens: number
          consumer_id: string | null
          created_at: string
          error: string | null
          id: string
          metadata: Json
          model: string
          prompt_tokens: number
          request_id: string | null
          status: string
          thread_id: string | null
          tool_calls: Json
          total_tokens: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel: string
          completion_tokens?: number
          consumer_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          model: string
          prompt_tokens?: number
          request_id?: string | null
          status?: string
          thread_id?: string | null
          tool_calls?: Json
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          completion_tokens?: number
          consumer_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          model?: string
          prompt_tokens?: number
          request_id?: string | null
          status?: string
          thread_id?: string | null
          tool_calls?: Json
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "v_api_consumers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_grand_winners: {
        Row: {
          award_year: number
          certificate_url: string | null
          created_at: string | null
          id: string
          provider_id: string
          story: string | null
          technician_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          award_year: number
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          provider_id: string
          story?: string | null
          technician_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          award_year?: number
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string
          story?: string | null
          technician_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annual_grand_winners_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_grand_winners_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_consumers: {
        Row: {
          allowed_origins: string[] | null
          api_key: string | null
          api_key_hash: string | null
          api_key_prefix: string | null
          auth_type: string
          branch_id: string | null
          channel: string
          client_secret_hash: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_rotated_at: string | null
          last_used_at: string | null
          metadata: Json | null
          name: string
          rate_limit_per_minute: number
          scopes: string[]
          storage_target: string
          total_requests: number
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          allowed_origins?: string[] | null
          api_key?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          auth_type?: string
          branch_id?: string | null
          channel?: string
          client_secret_hash?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          rate_limit_per_minute?: number
          scopes?: string[]
          storage_target?: string
          total_requests?: number
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          allowed_origins?: string[] | null
          api_key?: string | null
          api_key_hash?: string | null
          api_key_prefix?: string | null
          auth_type?: string
          branch_id?: string | null
          channel?: string
          client_secret_hash?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_rotated_at?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          rate_limit_per_minute?: number
          scopes?: string[]
          storage_target?: string
          total_requests?: number
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_consumers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_consumers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_consumers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_gateway_logs: {
        Row: {
          client_ip: unknown
          consumer_id: string | null
          consumer_type: string | null
          created_at: string | null
          duration_ms: number
          id: string
          method: string
          request_body: string | null
          request_headers: Json | null
          request_id: string
          response_headers: Json | null
          response_size: number | null
          route: string
          status_code: number
          user_agent: string | null
        }
        Insert: {
          client_ip: unknown
          consumer_id?: string | null
          consumer_type?: string | null
          created_at?: string | null
          duration_ms: number
          id?: string
          method: string
          request_body?: string | null
          request_headers?: Json | null
          request_id: string
          response_headers?: Json | null
          response_size?: number | null
          route: string
          status_code: number
          user_agent?: string | null
        }
        Update: {
          client_ip?: unknown
          consumer_id?: string | null
          consumer_type?: string | null
          created_at?: string | null
          duration_ms?: number
          id?: string
          method?: string
          request_body?: string | null
          request_headers?: Json | null
          request_id?: string
          response_headers?: Json | null
          response_size?: number | null
          route?: string
          status_code?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      api_idempotency_keys: {
        Row: {
          consumer_id: string
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string
          response_body: Json | null
          response_status: number | null
        }
        Insert: {
          consumer_id: string
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          request_hash: string
          response_body?: Json | null
          response_status?: number | null
        }
        Update: {
          consumer_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          response_body?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_idempotency_keys_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_idempotency_keys_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_idempotency_keys_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "v_api_consumers_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      api_webhook_deliveries: {
        Row: {
          attempt_number: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          subscription_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "api_webhook_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "v_api_webhooks_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      api_webhook_subscriptions: {
        Row: {
          consumer_id: string
          created_at: string
          description: string | null
          endpoint_url: string
          event_types: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_delivery_status: string | null
          secret: string
          updated_at: string
        }
        Insert: {
          consumer_id: string
          created_at?: string
          description?: string | null
          endpoint_url: string
          event_types?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          secret: string
          updated_at?: string
        }
        Update: {
          consumer_id?: string
          created_at?: string
          description?: string | null
          endpoint_url?: string
          event_types?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          secret?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "v_api_consumers_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      app_control: {
        Row: {
          id: string
          is_locked: boolean
          message: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          is_locked?: boolean
          message?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          is_locked?: boolean
          message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          encrypted: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          encrypted?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          encrypted?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          allow_edit_after_start: boolean | null
          allow_self_registration: boolean | null
          allow_technician_quotes: boolean | null
          app_logo_url: string | null
          app_name: string
          auto_backup_enabled: boolean | null
          background_color: string | null
          backup_frequency: string | null
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          created_at: string
          custom_css: string | null
          default_currency: string | null
          default_language: string | null
          enable_2fa: boolean | null
          enable_email_notifications: boolean | null
          enable_in_app_notifications: boolean | null
          enable_reminders: boolean | null
          enable_sms_notifications: boolean | null
          enable_technician_rating: boolean | null
          erpnext_enabled: boolean | null
          erpnext_url: string | null
          google_maps_enabled: boolean | null
          id: string
          lock_sensitive_settings: boolean | null
          map_style: string | null
          max_execution_time: number | null
          notification_templates: Json | null
          notification_types: Json | null
          primary_color: string | null
          require_manager_approval: boolean | null
          secondary_color: string | null
          session_timeout: number | null
          show_footer: boolean | null
          show_technicians_on_map: boolean | null
          smtp_from_email: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          theme_mode: string | null
          timezone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          erpnext_url?: string | null
          google_maps_enabled?: boolean | null
          id?: string
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          smtp_from_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          erpnext_url?: string | null
          google_maps_enabled?: boolean | null
          id?: string
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          smtp_from_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_email_enc: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          customer_phone_enc: string | null
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          maintenance_request_id: string | null
          notes: string | null
          property_id: string | null
          provider_id: string | null
          reminder_sent: boolean
          request_id: string
          status: string
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_email_enc?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          customer_phone_enc?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          property_id?: string | null
          provider_id?: string | null
          reminder_sent?: boolean
          request_id: string
          status?: string
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_email_enc?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          customer_phone_enc?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          property_id?: string | null
          provider_id?: string | null
          reminder_sent?: boolean
          request_id?: string
          status?: string
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      authorized_owners: {
        Row: {
          created_at: string | null
          email: string | null
          email_pattern: string | null
          id: string
          is_active: boolean | null
          is_pattern: boolean
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          email_pattern?: string | null
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string | null
          email_pattern?: string | null
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          bot_source: string | null
          client_phone: string | null
          context: Json
          created_at: string
          expires_at: string
          id: string
          last_request_id: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          bot_source?: string | null
          client_phone?: string | null
          context?: Json
          created_at?: string
          expires_at?: string
          id?: string
          last_request_id?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          bot_source?: string | null
          client_phone?: string | null
          context?: Json
          created_at?: string
          expires_at?: string
          id?: string
          last_request_id?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_locations: {
        Row: {
          address: string | null
          branch: string
          branch_name: string | null
          branch_type: string | null
          city: string | null
          created_at: string
          district: string | null
          icon: string | null
          id: string
          latitude: string | null
          link: string | null
          longitude: string | null
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch: string
          branch_name?: string | null
          branch_type?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          icon?: string | null
          id: string
          latitude?: string | null
          link?: string | null
          longitude?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string
          branch_name?: string | null
          branch_type?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          icon?: string | null
          id?: string
          latitude?: string | null
          link?: string | null
          longitude?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          city_id: number | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          district_id: number | null
          geo: Json | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          opening_hours: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          city_id?: number | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          district_id?: number | null
          geo?: Json | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          city_id?: number | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          district_id?: number | null
          geo?: Json | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          app_id: string | null
          artifact_size: number | null
          build_id: string | null
          completed_at: string | null
          created_at: string | null
          download_url: string | null
          error_message: string | null
          id: string
          platform: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          app_id?: string | null
          artifact_size?: number | null
          build_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          app_id?: string | null
          artifact_size?: number | null
          build_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          last_message_at: string | null
          provider_id: string | null
          request_id: string | null
          status: string
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          last_message_at?: string | null
          provider_id?: string | null
          request_id?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string | null
          request_id?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message: string
          message_type: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string
          sender_id: string
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_knowledge: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          source_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          source_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          source_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: number
          name_ar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name_ar: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          channel: string
          content: string
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          external_message_id: string | null
          failed_at: string | null
          id: string
          message_type: string | null
          metadata: Json
          provider_id: string | null
          read_at: string | null
          recipient: string | null
          recipient_user_id: string | null
          request_id: string | null
          retry_count: number
          sender_user_id: string | null
          sent_at: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json
          provider_id?: string | null
          read_at?: string | null
          recipient?: string | null
          recipient_user_id?: string | null
          request_id?: string | null
          retry_count?: number
          sender_user_id?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json
          provider_id?: string | null
          read_at?: string | null
          recipient?: string | null
          recipient_user_id?: string | null
          request_id?: string | null
          retry_count?: number
          sender_user_id?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_cycle: string | null
          created_at: string
          created_by: string | null
          eta_tax_profile_id: string | null
          id: string
          name: string
          pricing_model: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          created_by?: string | null
          eta_tax_profile_id?: string | null
          id?: string
          name: string
          pricing_model?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          created_by?: string | null
          eta_tax_profile_id?: string | null
          id?: string
          name?: string
          pricing_model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultation_bookings: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          company_id: string | null
          created_at: string
          current_location: unknown
          customer_code: string | null
          email: string | null
          first_seen_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          metadata: Json
          name: string | null
          notes: string | null
          phone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          current_location?: unknown
          customer_code?: string | null
          email?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          current_location?: unknown
          customer_code?: string | null
          email?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daftra_sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          maintenance_request_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          sync_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          maintenance_request_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
          sync_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          maintenance_request_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "daftra_sync_logs_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daftra_sync_logs_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daftra_sync_logs_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daftra_sync_logs_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          city_id: number
          created_at: string
          id: number
          name_ar: string
          updated_at: string
        }
        Insert: {
          city_id: number
          created_at?: string
          id?: number
          name_ar: string
          updated_at?: string
        }
        Update: {
          city_id?: number
          created_at?: string
          id?: number
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          document_id: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name: string
          created_at?: string
          document_id: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          created_at: string
          document_id: string
          id: string
          page: number | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          text: string
          updated_at: string
          user_id: string | null
          user_name: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          page?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          text: string
          updated_at?: string
          user_id?: string | null
          user_name: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          page?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          text?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reviewers: {
        Row: {
          access_hash: string
          created_at: string
          department: string
          document_id: string
          id: string
          rejection_reason: string | null
          reviewer_email: string
          reviewer_name: string
          signature_data: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_hash?: string
          created_at?: string
          department: string
          document_id: string
          id?: string
          rejection_reason?: string | null
          reviewer_email: string
          reviewer_name: string
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_hash?: string
          created_at?: string
          department?: string
          document_id?: string
          id?: string
          rejection_reason?: string | null
          reviewer_email?: string
          reviewer_name?: string
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reviewers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          pdf_hash: string | null
          signature_data: string
          signed_at: string
          signed_pdf_url: string | null
          signer_id: string | null
          signer_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          pdf_hash?: string | null
          signature_data: string
          signed_at?: string
          signed_pdf_url?: string | null
          signer_id?: string | null
          signer_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          pdf_hash?: string | null
          signature_data?: string
          signed_at?: string
          signed_pdf_url?: string | null
          signer_id?: string | null
          signer_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          file_url: string
          id: string
          notes: string | null
          source: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          file_url: string
          id?: string
          notes?: string | null
          source: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_url?: string
          id?: string
          notes?: string | null
          source?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_extracted_data: Json | null
          ai_summary: string | null
          assigned_approver_id: string | null
          assigned_reviewer_id: string | null
          client_email: string | null
          client_name: string
          created_at: string
          created_by: string | null
          currency: string
          daftra_id: string | null
          date: string
          description: string | null
          file_hash: string | null
          file_url: string | null
          html_url: string | null
          id: string
          magicplan_gallery_url: string | null
          number: string
          payment_status: string
          pdf_url: string | null
          project_id: string | null
          raw_json: Json | null
          sender_name: string | null
          status: string
          synced_at: string | null
          title: string | null
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          assigned_approver_id?: string | null
          assigned_reviewer_id?: string | null
          client_email?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          currency?: string
          daftra_id?: string | null
          date?: string
          description?: string | null
          file_hash?: string | null
          file_url?: string | null
          html_url?: string | null
          id?: string
          magicplan_gallery_url?: string | null
          number: string
          payment_status?: string
          pdf_url?: string | null
          project_id?: string | null
          raw_json?: Json | null
          sender_name?: string | null
          status?: string
          synced_at?: string | null
          title?: string | null
          total?: number
          type: string
          updated_at?: string
        }
        Update: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          assigned_approver_id?: string | null
          assigned_reviewer_id?: string | null
          client_email?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          daftra_id?: string | null
          date?: string
          description?: string | null
          file_hash?: string | null
          file_url?: string | null
          html_url?: string | null
          id?: string
          magicplan_gallery_url?: string | null
          number?: string
          payment_status?: string
          pdf_url?: string | null
          project_id?: string | null
          raw_json?: Json | null
          sender_name?: string | null
          status?: string
          synced_at?: string | null
          title?: string | null
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id: string | null
          correlation_id: string | null
          event_payload: Json
          event_type: string
          id: string
          occurred_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          aggregate_id: string
          aggregate_type: string
          causation_id?: string | null
          correlation_id?: string | null
          event_payload?: Json
          event_type: string
          id?: string
          occurred_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          aggregate_id?: string
          aggregate_type?: string
          causation_id?: string | null
          correlation_id?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          occurred_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          count: number | null
          created_at: string | null
          error_hash: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          level: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          stack: string | null
          updated_at: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          error_hash?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          level?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          stack?: string | null
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          error_hash?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          stack?: string | null
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      eta_settings: {
        Row: {
          activity_code: string | null
          auto_submit_on_paid: boolean
          branch_building_number: string | null
          branch_city: string | null
          branch_country: string
          branch_governate: string | null
          branch_id: string
          branch_postal_code: string | null
          branch_street: string | null
          created_at: string
          default_item_code: string | null
          default_item_code_type: string
          default_item_name: string | null
          default_tax_subtype: string
          default_unit_type: string
          environment: string
          id: string
          is_enabled: boolean
          signing_enabled: boolean
          signing_service_url: string | null
          taxpayer_name: string | null
          taxpayer_tin: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_code?: string | null
          auto_submit_on_paid?: boolean
          branch_building_number?: string | null
          branch_city?: string | null
          branch_country?: string
          branch_governate?: string | null
          branch_id?: string
          branch_postal_code?: string | null
          branch_street?: string | null
          created_at?: string
          default_item_code?: string | null
          default_item_code_type?: string
          default_item_name?: string | null
          default_tax_subtype?: string
          default_unit_type?: string
          environment?: string
          id?: string
          is_enabled?: boolean
          signing_enabled?: boolean
          signing_service_url?: string | null
          taxpayer_name?: string | null
          taxpayer_tin?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_code?: string | null
          auto_submit_on_paid?: boolean
          branch_building_number?: string | null
          branch_city?: string | null
          branch_country?: string
          branch_governate?: string | null
          branch_id?: string
          branch_postal_code?: string | null
          branch_street?: string | null
          created_at?: string
          default_item_code?: string | null
          default_item_code_type?: string
          default_item_name?: string | null
          default_tax_subtype?: string
          default_unit_type?: string
          environment?: string
          id?: string
          is_enabled?: boolean
          signing_enabled?: boolean
          signing_service_url?: string | null
          taxpayer_name?: string | null
          taxpayer_tin?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      eta_submissions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          document_uuid: string | null
          environment: string | null
          error_message: string | null
          http_status: number | null
          id: string
          invoice_id: string | null
          long_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          submission_uuid: string | null
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          document_uuid?: string | null
          environment?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          invoice_id?: string | null
          long_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          submission_uuid?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          document_uuid?: string | null
          environment?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          invoice_id?: string | null
          long_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          submission_uuid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eta_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eta_submissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoices_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          maintenance_request_id: string | null
          request_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          maintenance_request_id?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          maintenance_request_id?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      facebook_leads: {
        Row: {
          ad_id: string | null
          address: string | null
          adgroup_id: string | null
          campaign_id: string | null
          city: string | null
          created_at: string
          email: string | null
          field_data: Json | null
          form_id: string
          full_name: string | null
          id: string
          leadgen_id: string
          maintenance_request_id: string | null
          message: string | null
          page_id: string
          phone: string | null
          processed_at: string | null
          raw_data: Json | null
          service_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          address?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          field_data?: Json | null
          form_id: string
          full_name?: string | null
          id?: string
          leadgen_id: string
          maintenance_request_id?: string | null
          message?: string | null
          page_id: string
          phone?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          address?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          field_data?: Json | null
          form_id?: string
          full_name?: string | null
          id?: string
          leadgen_id?: string
          maintenance_request_id?: string | null
          message?: string | null
          page_id?: string
          phone?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_leads_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_leads_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_leads_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_leads_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      file_assets: {
        Row: {
          bucket_id: string | null
          created_at: string
          document_type: string | null
          entity_id: string | null
          entity_type: string | null
          file_size: number | null
          id: string
          legacy_url: string | null
          metadata: Json
          mime_type: string | null
          object_path: string | null
          original_name: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string
          document_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_size?: number | null
          id?: string
          legacy_url?: string | null
          metadata?: Json
          mime_type?: string | null
          object_path?: string | null
          original_name?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string
          document_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_size?: number | null
          id?: string
          legacy_url?: string | null
          metadata?: Json
          mime_type?: string | null
          object_path?: string | null
          original_name?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          folder: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          folder?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          folder?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hall_of_excellence: {
        Row: {
          achievement_date: string
          achievement_description: string | null
          achievement_title: string
          achievement_type: string
          created_at: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          media_urls: string[] | null
          provider_id: string
          story: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          achievement_date: string
          achievement_description?: string | null
          achievement_title: string
          achievement_type: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          media_urls?: string[] | null
          provider_id: string
          story?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          achievement_date?: string
          achievement_description?: string | null
          achievement_title?: string
          achievement_type?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          media_urls?: string[] | null
          provider_id?: string
          story?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_of_excellence_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_of_excellence_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          item_code: string | null
          name_ar: string
          name_en: string | null
          reorder_level: number
          selling_price: number
          unit: string
          updated_at: string
          vat_rate: number
          withholding_rate: number
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_code?: string | null
          name_ar: string
          name_en?: string | null
          reorder_level?: number
          selling_price?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
          withholding_rate?: number
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_code?: string | null
          name_ar?: string
          name_en?: string | null
          reorder_level?: number
          selling_price?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
          withholding_rate?: number
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_code: string | null
          movement_type: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          request_id: string | null
          total_cost: number | null
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_code?: string | null
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          request_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_code?: string | null
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          request_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          id: string
          item_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          item_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          item_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouses: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name_ar: string
          name_en: string | null
          notes: string | null
          updated_at: string
          warehouse_code: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
          warehouse_code?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
          warehouse_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          quantity: number
          service_name: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          service_name: string
          total_price?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          service_name?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoices_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_public_summaries: {
        Row: {
          amount: number | null
          currency: string | null
          due_date: string | null
          invoice_number: string | null
          issue_date: string | null
          items: Json
          paid_at: string | null
          pdf_url: string | null
          request_id: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          due_date?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          items?: Json
          paid_at?: string | null
          pdf_url?: string | null
          request_id: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          currency?: string | null
          due_date?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          items?: Json
          paid_at?: string | null
          pdf_url?: string | null
          request_id?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_public_summaries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_public_summaries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_public_summaries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_public_summaries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          company_address: string | null
          company_name: string | null
          company_phone: string | null
          company_tax_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          due_date: string | null
          eta_environment: string | null
          eta_error: string | null
          eta_internal_id: string | null
          eta_long_id: string | null
          eta_status: string
          eta_submission_uuid: string | null
          eta_submitted_at: string | null
          eta_uuid: string | null
          id: string
          invoice_number: string
          is_locked: boolean
          issue_date: string
          items: Json | null
          last_modified_by: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          request_id: string
          sent_at: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          updated_at: string
          vat_rate: number
          version: number
          withholding_amount: number
        }
        Insert: {
          amount: number
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tax_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string | null
          eta_environment?: string | null
          eta_error?: string | null
          eta_internal_id?: string | null
          eta_long_id?: string | null
          eta_status?: string
          eta_submission_uuid?: string | null
          eta_submitted_at?: string | null
          eta_uuid?: string | null
          id?: string
          invoice_number: string
          is_locked?: boolean
          issue_date?: string
          items?: Json | null
          last_modified_by?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          request_id: string
          sent_at?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
          vat_rate?: number
          version?: number
          withholding_amount?: number
        }
        Update: {
          amount?: number
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tax_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string | null
          eta_environment?: string | null
          eta_error?: string | null
          eta_internal_id?: string | null
          eta_long_id?: string | null
          eta_status?: string
          eta_submission_uuid?: string | null
          eta_submitted_at?: string | null
          eta_uuid?: string | null
          id?: string
          invoice_number?: string
          is_locked?: boolean
          issue_date?: string
          items?: Json | null
          last_modified_by?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          request_id?: string
          sent_at?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
          vat_rate?: number
          version?: number
          withholding_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_messages: {
        Row: {
          account: string
          body_html: string | null
          body_text: string | null
          cc_addrs: Json | null
          created_at: string
          folder: string
          from_addr: string | null
          from_name: string | null
          has_attachments: boolean | null
          id: string
          internal_date: string | null
          is_read: boolean | null
          is_sent: boolean | null
          is_starred: boolean | null
          message_id: string | null
          preview: string | null
          raw_size: number | null
          subject: string | null
          thread_id: string | null
          to_addrs: Json | null
          uid: number | null
        }
        Insert: {
          account?: string
          body_html?: string | null
          body_text?: string | null
          cc_addrs?: Json | null
          created_at?: string
          folder?: string
          from_addr?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          internal_date?: string | null
          is_read?: boolean | null
          is_sent?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          preview?: string | null
          raw_size?: number | null
          subject?: string | null
          thread_id?: string | null
          to_addrs?: Json | null
          uid?: number | null
        }
        Update: {
          account?: string
          body_html?: string | null
          body_text?: string | null
          cc_addrs?: Json | null
          created_at?: string
          folder?: string
          from_addr?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          internal_date?: string | null
          is_read?: boolean | null
          is_sent?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          preview?: string | null
          raw_size?: number | null
          subject?: string | null
          thread_id?: string | null
          to_addrs?: Json | null
          uid?: number | null
        }
        Relationships: []
      }
      mail_sync_state: {
        Row: {
          account: string
          created_at: string
          folder: string
          last_error: string | null
          last_synced_at: string | null
          last_uid: number
          updated_at: string
        }
        Insert: {
          account: string
          created_at?: string
          folder: string
          last_error?: string | null
          last_synced_at?: string | null
          last_uid?: number
          updated_at?: string
        }
        Update: {
          account?: string
          created_at?: string
          folder?: string
          last_error?: string | null
          last_synced_at?: string | null
          last_uid?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_contracts: {
        Row: {
          auto_renew: boolean | null
          billing_type: Database["public"]["Enums"]["contract_billing_type"]
          branch_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          company_id: string
          contract_number: string
          contract_value: number | null
          covered_services: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percentage: number | null
          end_date: string
          excluded_services: string[] | null
          id: string
          includes_parts: boolean | null
          internal_notes: string | null
          max_requests: number | null
          property_id: string | null
          renewal_reminder_days: number | null
          sla_resolution_hours: number | null
          sla_response_hours: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          terms_and_conditions: string | null
          title: string
          updated_at: string
          used_requests: number | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_type?: Database["public"]["Enums"]["contract_billing_type"]
          branch_id?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          company_id: string
          contract_number: string
          contract_value?: number | null
          covered_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          end_date: string
          excluded_services?: string[] | null
          id?: string
          includes_parts?: boolean | null
          internal_notes?: string | null
          max_requests?: number | null
          property_id?: string | null
          renewal_reminder_days?: number | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
          used_requests?: number | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_type?: Database["public"]["Enums"]["contract_billing_type"]
          branch_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          company_id?: string
          contract_number?: string
          contract_value?: number | null
          covered_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string
          excluded_services?: string[] | null
          id?: string
          includes_parts?: boolean | null
          internal_notes?: string | null
          max_requests?: number | null
          property_id?: string | null
          renewal_reminder_days?: number | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
          used_requests?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_request_items: {
        Row: {
          created_at: string
          description: string
          id: string
          line_no: number
          line_total: number
          note: string | null
          quantity: number
          request_id: string
          source_completion_date: string | null
          source_item_id: string | null
          source_request_date: string | null
          source_store_name: string | null
          source_year: number | null
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_no: number
          line_total?: number
          note?: string | null
          quantity?: number
          request_id: string
          source_completion_date?: string | null
          source_item_id?: string | null
          source_request_date?: string | null
          source_store_name?: string | null
          source_year?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_no?: number
          line_total?: number
          note?: string | null
          quantity?: number
          request_id?: string
          source_completion_date?: string | null
          source_item_id?: string | null
          source_request_date?: string | null
          source_store_name?: string | null
          source_year?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          archived_at: string | null
          asset_id: string | null
          assigned_technician_id: string | null
          assigned_vendor_id: string | null
          branch_id: string
          category_id: string | null
          channel: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          closed_at: string | null
          closure_reason: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          created_via_consumer_id: string | null
          customer_id: string
          customer_notes: string | null
          daftra_invoice_id: string | null
          daftra_sync_status: string | null
          daftra_synced_at: string | null
          description: string | null
          estimated_cost: number | null
          feedback_comment: string | null
          handover_signature: string | null
          handover_to_admin_at: string | null
          handover_to_admin_by: string | null
          id: string
          last_modified_by: string | null
          latitude: number | null
          legacy_created_by: string | null
          legacy_source: string | null
          legacy_store_id: string | null
          location: string | null
          longitude: number | null
          opened_by_role: string | null
          priority: string | null
          property_id: string | null
          rated_at: string | null
          rating: number | null
          request_number: string | null
          request_status_derived:
            | Database["public"]["Enums"]["request_status_canonical"]
            | null
          service_type: string | null
          sla_accept_due: string | null
          sla_arrive_due: string | null
          sla_complete_due: string | null
          sla_deadline: string | null
          sla_due_date: string | null
          status: Database["public"]["Enums"]["mr_status"]
          subcategory_id: string | null
          title: string
          updated_at: string | null
          vendor_notes: string | null
          version: number
          workflow_stage: string | null
          workflow_stage_v2: Database["public"]["Enums"]["workflow_stage_t"]
        }
        Insert: {
          actual_cost?: number | null
          archived_at?: string | null
          asset_id?: string | null
          assigned_technician_id?: string | null
          assigned_vendor_id?: string | null
          branch_id: string
          category_id?: string | null
          channel?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via_consumer_id?: string | null
          customer_id: string
          customer_notes?: string | null
          daftra_invoice_id?: string | null
          daftra_sync_status?: string | null
          daftra_synced_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          feedback_comment?: string | null
          handover_signature?: string | null
          handover_to_admin_at?: string | null
          handover_to_admin_by?: string | null
          id?: string
          last_modified_by?: string | null
          latitude?: number | null
          legacy_created_by?: string | null
          legacy_source?: string | null
          legacy_store_id?: string | null
          location?: string | null
          longitude?: number | null
          opened_by_role?: string | null
          priority?: string | null
          property_id?: string | null
          rated_at?: string | null
          rating?: number | null
          request_number?: string | null
          request_status_derived?:
            | Database["public"]["Enums"]["request_status_canonical"]
            | null
          service_type?: string | null
          sla_accept_due?: string | null
          sla_arrive_due?: string | null
          sla_complete_due?: string | null
          sla_deadline?: string | null
          sla_due_date?: string | null
          status?: Database["public"]["Enums"]["mr_status"]
          subcategory_id?: string | null
          title: string
          updated_at?: string | null
          vendor_notes?: string | null
          version?: number
          workflow_stage?: string | null
          workflow_stage_v2?: Database["public"]["Enums"]["workflow_stage_t"]
        }
        Update: {
          actual_cost?: number | null
          archived_at?: string | null
          asset_id?: string | null
          assigned_technician_id?: string | null
          assigned_vendor_id?: string | null
          branch_id?: string
          category_id?: string | null
          channel?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          created_via_consumer_id?: string | null
          customer_id?: string
          customer_notes?: string | null
          daftra_invoice_id?: string | null
          daftra_sync_status?: string | null
          daftra_synced_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          feedback_comment?: string | null
          handover_signature?: string | null
          handover_to_admin_at?: string | null
          handover_to_admin_by?: string | null
          id?: string
          last_modified_by?: string | null
          latitude?: number | null
          legacy_created_by?: string | null
          legacy_source?: string | null
          legacy_store_id?: string | null
          location?: string | null
          longitude?: number | null
          opened_by_role?: string | null
          priority?: string | null
          property_id?: string | null
          rated_at?: string | null
          rating?: number | null
          request_number?: string | null
          request_status_derived?:
            | Database["public"]["Enums"]["request_status_canonical"]
            | null
          service_type?: string | null
          sla_accept_due?: string | null
          sla_arrive_due?: string | null
          sla_complete_due?: string | null
          sla_deadline?: string | null
          sla_due_date?: string | null
          status?: Database["public"]["Enums"]["mr_status"]
          subcategory_id?: string | null
          title?: string
          updated_at?: string | null
          vendor_notes?: string | null
          version?: number
          workflow_stage?: string | null
          workflow_stage_v2?: Database["public"]["Enums"]["workflow_stage_t"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_mr_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_created_via_consumer_id_fkey"
            columns: ["created_via_consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_created_via_consumer_id_fkey"
            columns: ["created_via_consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_created_via_consumer_id_fkey"
            columns: ["created_via_consumer_id"]
            isOneToOne: false
            referencedRelation: "v_api_consumers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customers_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      malls: {
        Row: {
          created_at: string
          id: number
          location: string | null
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          location?: string | null
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          location?: string | null
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_files: {
        Row: {
          created_at: string | null
          direction: string | null
          file_size: number | null
          file_type: string | null
          filename: string | null
          from_phone: string | null
          id: number
          media_id: string
          message_id: string
          meta_url: string | null
          mime_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string | null
          from_phone?: string | null
          id?: number
          media_id: string
          message_id: string
          meta_url?: string | null
          mime_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string | null
          from_phone?: string | null
          id?: number
          media_id?: string
          message_id?: string
          meta_url?: string | null
          mime_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      media_processing_errors: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          error_type: string | null
          file_type: string | null
          from_phone: string | null
          id: string
          media_id: string | null
          message_id: string | null
          occurred_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          file_type?: string | null
          from_phone?: string | null
          id?: string
          media_id?: string | null
          message_id?: string | null
          occurred_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          file_type?: string | null
          from_phone?: string | null
          id?: string
          media_id?: string | null
          message_id?: string | null
          occurred_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      media_stats_daily: {
        Row: {
          by_type: Json | null
          created_at: string | null
          date: string
          id: string
          inbound_count: number | null
          outbound_count: number | null
          total_files: number | null
          total_size: number | null
          updated_at: string | null
        }
        Insert: {
          by_type?: Json | null
          created_at?: string | null
          date: string
          id?: string
          inbound_count?: number | null
          outbound_count?: number | null
          total_files?: number | null
          total_size?: number | null
          updated_at?: string | null
        }
        Update: {
          by_type?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          inbound_count?: number | null
          outbound_count?: number | null
          total_files?: number | null
          total_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          module_key: string
          module_name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_key: string
          module_name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_key?: string
          module_name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_excellence_awards: {
        Row: {
          announcement_url: string | null
          award_month: string
          award_type: string
          certificate_url: string | null
          created_at: string | null
          id: string
          provider_id: string
          reward_description: string | null
          reward_value: number | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          announcement_url?: string | null
          award_month: string
          award_type: string
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          provider_id: string
          reward_description?: string | null
          reward_value?: number | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          announcement_url?: string | null
          award_month?: string
          award_type?: string
          certificate_url?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string
          reward_description?: string | null
          reward_value?: number | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_excellence_awards_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_excellence_awards_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          message_log_id: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          sms_sent: boolean | null
          title: string
          type: string
          updated_at: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          message_log_id?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          sms_sent?: boolean | null
          title: string
          type?: string
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          message_log_id?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          sms_sent?: boolean | null
          title?: string
          type?: string
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: false
            referencedRelation: "communication_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: false
            referencedRelation: "message_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_message_events: {
        Row: {
          event_type: string
          id: string
          message_id: string
          occurred_at: string
          provider_payload: Json | null
          status: Database["public"]["Enums"]["message_status_t"] | null
        }
        Insert: {
          event_type: string
          id?: string
          message_id: string
          occurred_at?: string
          provider_payload?: Json | null
          status?: Database["public"]["Enums"]["message_status_t"] | null
        }
        Update: {
          event_type?: string
          id?: string
          message_id?: string
          occurred_at?: string
          provider_payload?: Json | null
          status?: Database["public"]["Enums"]["message_status_t"] | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_message_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outbound_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_message_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_outbound_messages_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["message_channel_t"]
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient: string
          related_aggregate_id: string | null
          related_aggregate_type: string | null
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status_t"]
          template_key: string | null
          template_lang: string | null
          template_variables: Json
          triggered_by_event_id: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel: Database["public"]["Enums"]["message_channel_t"]
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient: string
          related_aggregate_id?: string | null
          related_aggregate_type?: string | null
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_t"]
          template_key?: string | null
          template_lang?: string | null
          template_variables?: Json
          triggered_by_event_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["message_channel_t"]
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient?: string
          related_aggregate_id?: string | null
          related_aggregate_type?: string | null
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_t"]
          template_key?: string | null
          template_lang?: string | null
          template_variables?: Json
          triggered_by_event_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_triggered_by_event_id_fkey"
            columns: ["triggered_by_event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json
          id: string
          new_status: string | null
          old_status: string | null
          payment_id: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          new_status?: string | null
          old_status?: string | null
          payment_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          new_status?: string | null
          old_status?: string | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          confidence: number
          created_at: string
          device_id: string
          id: string
          matched_payment_id: string | null
          notification_text: string | null
          notification_title: string | null
          package_name: string | null
          parsed_amount: number | null
          parsed_reference: string | null
          parsed_sender_phone: string | null
          payload: Json
          provider: string
          raw_text: string
          received_at: string
          status: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          device_id: string
          id?: string
          matched_payment_id?: string | null
          notification_text?: string | null
          notification_title?: string | null
          package_name?: string | null
          parsed_amount?: number | null
          parsed_reference?: string | null
          parsed_sender_phone?: string | null
          payload?: Json
          provider: string
          raw_text: string
          received_at?: string
          status?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          device_id?: string
          id?: string
          matched_payment_id?: string | null
          notification_text?: string | null
          notification_title?: string | null
          package_name?: string | null
          parsed_amount?: number | null
          parsed_reference?: string | null
          parsed_sender_phone?: string | null
          payload?: Json
          provider?: string
          raw_text?: string
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_claimed_paid: boolean
          customer_name: string | null
          customer_phone: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          method: string | null
          paid_at: string | null
          payment_code: string
          payment_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_claimed_paid?: boolean
          customer_name?: string | null
          customer_phone?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          payment_code: string
          payment_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_claimed_paid?: boolean
          customer_name?: string | null
          customer_phone?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          payment_code?: string
          payment_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          callback_payload: Json | null
          cart_id: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          invoice_id: string | null
          paid_at: string | null
          payment_url: string | null
          provider: string
          raw_response: Json | null
          request_id: string | null
          status: string
          tran_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          callback_payload?: Json | null
          cart_id: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          provider?: string
          raw_response?: Json | null
          request_id?: string | null
          status?: string
          tran_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          callback_payload?: Json | null
          cart_id?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          payment_url?: string | null
          provider?: string
          raw_response?: Json | null
          request_id?: string | null
          status?: string
          tran_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoices_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          iframe_key: string | null
          is_deleted: boolean | null
          is_placeholder: boolean
          last_modified_by: string | null
          last_name: string | null
          link_3d: string | null
          name: string
          phone: string | null
          photo_link: string | null
          plan_link: string | null
          position: string | null
          reports_to: string | null
          role: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          iframe_key?: string | null
          is_deleted?: boolean | null
          is_placeholder?: boolean
          last_modified_by?: string | null
          last_name?: string | null
          link_3d?: string | null
          name: string
          phone?: string | null
          photo_link?: string | null
          plan_link?: string | null
          position?: string | null
          reports_to?: string | null
          role: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          iframe_key?: string | null
          is_deleted?: boolean | null
          is_placeholder?: boolean
          last_modified_by?: string | null
          last_name?: string | null
          link_3d?: string | null
          name?: string
          phone?: string | null
          photo_link?: string | null
          plan_link?: string | null
          position?: string | null
          reports_to?: string | null
          role?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_images: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          document_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_name: string
          id: string
          is_featured: boolean | null
          mime_type: string | null
          project_id: string | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          document_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_name: string
          id?: string
          is_featured?: boolean | null
          mime_type?: string | null
          project_id?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          document_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_name?: string
          id?: string
          is_featured?: boolean | null
          mime_type?: string | null
          project_id?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_images_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          budget: number | null
          company_name: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          gallery_url: string | null
          id: string
          last_modified_by: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          magicplan_iframe_url: string | null
          manager_id: string | null
          name: string
          progress: number | null
          project_type: string | null
          sketch_url: string | null
          start_date: string | null
          status: string
          updated_at: string | null
          version: number
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          budget?: number | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id: string
          last_modified_by?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          magicplan_iframe_url?: string | null
          manager_id?: string | null
          name: string
          progress?: number | null
          project_type?: string | null
          sketch_url?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          budget?: number | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id?: string
          last_modified_by?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          magicplan_iframe_url?: string | null
          manager_id?: string | null
          name?: string
          progress?: number | null
          project_type?: string | null
          sketch_url?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: string[] | null
          area: number | null
          bathrooms: number | null
          city_id: number | null
          code: string | null
          created_at: string
          created_by: string
          description: string | null
          district_id: number | null
          floors: number | null
          icon_url: string | null
          id: string
          images: string[] | null
          last_inspection_date: string | null
          last_modified_by: string | null
          latitude: number | null
          longitude: number | null
          maintenance_schedule: string | null
          manager_id: string | null
          metadata: Json
          name: string
          next_inspection_date: string | null
          parking_spaces: number | null
          qr_code_data: string | null
          qr_code_generated_at: string | null
          region_id: string | null
          rooms: number | null
          status: string
          type: string
          updated_at: string
          value: number | null
          version: number
        }
        Insert: {
          address: string
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          city_id?: number | null
          code?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          district_id?: number | null
          floors?: number | null
          icon_url?: string | null
          id?: string
          images?: string[] | null
          last_inspection_date?: string | null
          last_modified_by?: string | null
          latitude?: number | null
          longitude?: number | null
          maintenance_schedule?: string | null
          manager_id?: string | null
          metadata?: Json
          name: string
          next_inspection_date?: string | null
          parking_spaces?: number | null
          qr_code_data?: string | null
          qr_code_generated_at?: string | null
          region_id?: string | null
          rooms?: number | null
          status?: string
          type: string
          updated_at?: string
          value?: number | null
          version?: number
        }
        Update: {
          address?: string
          amenities?: string[] | null
          area?: number | null
          bathrooms?: number | null
          city_id?: number | null
          code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          district_id?: number | null
          floors?: number | null
          icon_url?: string | null
          id?: string
          images?: string[] | null
          last_inspection_date?: string | null
          last_modified_by?: string | null
          latitude?: number | null
          longitude?: number | null
          maintenance_schedule?: string | null
          manager_id?: string | null
          metadata?: Json
          name?: string
          next_inspection_date?: string | null
          parking_spaces?: number | null
          qr_code_data?: string | null
          qr_code_generated_at?: string | null
          region_id?: string | null
          rooms?: number | null
          status?: string
          type?: string
          updated_at?: string
          value?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_badges: {
        Row: {
          awarded_at: string | null
          awarded_for: string | null
          badge_description: string | null
          badge_title: string
          badge_type: string
          created_at: string | null
          id: string
          provider_id: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_for?: string | null
          badge_description?: string | null
          badge_title: string
          badge_type: string
          created_at?: string | null
          id?: string
          provider_id: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          awarded_at?: string | null
          awarded_for?: string | null
          badge_description?: string | null
          badge_title?: string
          badge_type?: string
          created_at?: string | null
          id?: string
          provider_id?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_badges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_badges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_coverage: {
        Row: {
          address: string | null
          center: unknown
          city_id: number | null
          city_name: string | null
          created_at: string
          district_id: number | null
          district_name: string | null
          id: string
          is_active: boolean
          metadata: Json
          provider_id: string
          radius_km: number | null
          source_id: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          center?: unknown
          city_id?: number | null
          city_name?: string | null
          created_at?: string
          district_id?: number | null
          district_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          provider_id: string
          radius_km?: number | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          center?: unknown
          city_id?: number | null
          city_name?: string | null
          created_at?: string
          district_id?: number | null
          district_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          provider_id?: string
          radius_km?: number | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_coverage_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_coverage_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_daily_stats: {
        Row: {
          average_arrival_time: number | null
          average_rating: number | null
          average_response_time: number | null
          complaints_received: number | null
          created_at: string
          date: string
          id: string
          provider_id: string
          technician_id: string
          total_earnings: number | null
          updated_at: string
          visits_accepted: number | null
          visits_assigned: number | null
          visits_cancelled: number | null
          visits_completed: number | null
          visits_rejected: number | null
        }
        Insert: {
          average_arrival_time?: number | null
          average_rating?: number | null
          average_response_time?: number | null
          complaints_received?: number | null
          created_at?: string
          date?: string
          id?: string
          provider_id: string
          technician_id: string
          total_earnings?: number | null
          updated_at?: string
          visits_accepted?: number | null
          visits_assigned?: number | null
          visits_cancelled?: number | null
          visits_completed?: number | null
          visits_rejected?: number | null
        }
        Update: {
          average_arrival_time?: number | null
          average_rating?: number | null
          average_response_time?: number | null
          complaints_received?: number | null
          created_at?: string
          date?: string
          id?: string
          provider_id?: string
          technician_id?: string
          total_earnings?: number | null
          updated_at?: string
          visits_accepted?: number | null
          visits_assigned?: number | null
          visits_cancelled?: number | null
          visits_completed?: number | null
          visits_rejected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_daily_stats_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_daily_stats_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string
          document_type: string
          expires_at: string | null
          file_asset_id: string | null
          id: string
          metadata: Json
          provider_id: string
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_asset_id?: string | null
          id?: string
          metadata?: Json
          provider_id: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_asset_id?: string | null
          id?: string
          metadata?: Json
          provider_id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_file_asset_id_fkey"
            columns: ["file_asset_id"]
            isOneToOne: false
            referencedRelation: "file_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_levels: {
        Row: {
          created_at: string | null
          current_level: string | null
          id: string
          level_updated_at: string | null
          promotion_history: Json | null
          provider_id: string
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: string | null
          id?: string
          level_updated_at?: string | null
          promotion_history?: Json | null
          provider_id: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: string | null
          id?: string
          level_updated_at?: string | null
          promotion_history?: Json | null
          provider_id?: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_levels_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_levels_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_performance: {
        Row: {
          average_rating: number | null
          cancelled_tasks: number | null
          complaints_count: number | null
          completed_tasks: number | null
          created_at: string | null
          excellence_count: number | null
          id: string
          last_calculated_at: string | null
          professionalism_score: number | null
          provider_id: string
          punctuality_score: number | null
          quality_score: number | null
          technician_id: string | null
          total_points: number | null
          total_tasks: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          cancelled_tasks?: number | null
          complaints_count?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          excellence_count?: number | null
          id?: string
          last_calculated_at?: string | null
          professionalism_score?: number | null
          provider_id: string
          punctuality_score?: number | null
          quality_score?: number | null
          technician_id?: string | null
          total_points?: number | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          cancelled_tasks?: number | null
          complaints_count?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          excellence_count?: number | null
          id?: string
          last_calculated_at?: string | null
          professionalism_score?: number | null
          provider_id?: string
          punctuality_score?: number | null
          quality_score?: number | null
          technician_id?: string | null
          total_points?: number | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_performance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_performance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_public_profiles: {
        Row: {
          availability_status: string | null
          available_from: string | null
          available_to: string | null
          bio: string | null
          display_name: string
          hourly_rate: number | null
          icon_url: string | null
          is_active: boolean
          is_public: boolean
          is_verified: boolean
          latitude: number | null
          legacy_id: string
          level: string | null
          location_updated_at: string | null
          longitude: number | null
          profile_image: string | null
          provider_id: string
          provider_kind: string
          rating: number | null
          service_area_radius: number | null
          specialization: string | null
          total_reviews: number
          updated_at: string
        }
        Insert: {
          availability_status?: string | null
          available_from?: string | null
          available_to?: string | null
          bio?: string | null
          display_name: string
          hourly_rate?: number | null
          icon_url?: string | null
          is_active: boolean
          is_public?: boolean
          is_verified: boolean
          latitude?: number | null
          legacy_id: string
          level?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          profile_image?: string | null
          provider_id: string
          provider_kind: string
          rating?: number | null
          service_area_radius?: number | null
          specialization?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          availability_status?: string | null
          available_from?: string | null
          available_to?: string | null
          bio?: string | null
          display_name?: string
          hourly_rate?: number | null
          icon_url?: string | null
          is_active?: boolean
          is_public?: boolean
          is_verified?: boolean
          latitude?: number | null
          legacy_id?: string
          level?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          profile_image?: string | null
          provider_id?: string
          provider_kind?: string
          rating?: number | null
          service_area_radius?: number | null
          specialization?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_public_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_public_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          created_at: string
          emergency_price: number | null
          experience_years: number | null
          id: string
          is_primary: boolean
          material_markup_percent: number | null
          metadata: Json
          minimum_job_value: number | null
          night_weekend_price: number | null
          provider_id: string
          service_id: string
          source_id: string | null
          source_type: string | null
          standard_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_price?: number | null
          experience_years?: number | null
          id?: string
          is_primary?: boolean
          material_markup_percent?: number | null
          metadata?: Json
          minimum_job_value?: number | null
          night_weekend_price?: number | null
          provider_id: string
          service_id: string
          source_id?: string | null
          source_type?: string | null
          standard_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_price?: number | null
          experience_years?: number | null
          id?: string
          is_primary?: boolean
          material_markup_percent?: number | null
          metadata?: Json
          minimum_job_value?: number | null
          night_weekend_price?: number | null
          provider_id?: string
          service_id?: string
          source_id?: string | null
          source_type?: string | null
          standard_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_service_catalog_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          invoice_id: string | null
          metadata: Json
          net_amount: number
          platform_fee: number
          provider_id: string
          request_id: string | null
          source_id: string | null
          source_type: string | null
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          net_amount: number
          platform_fee?: number
          provider_id: string
          request_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          net_amount?: number
          platform_fee?: number
          provider_id?: string
          request_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoices_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_wallet: {
        Row: {
          balance_current: number
          balance_locked: number
          balance_pending: number
          created_at: string
          id: string
          last_withdrawal_at: string | null
          metadata: Json
          minimum_withdrawal: number
          provider_id: string
          source_id: string | null
          source_type: string | null
          total_earned: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          balance_current?: number
          balance_locked?: number
          balance_pending?: number
          created_at?: string
          id?: string
          last_withdrawal_at?: string | null
          metadata?: Json
          minimum_withdrawal?: number
          provider_id: string
          source_id?: string | null
          source_type?: string | null
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          balance_current?: number
          balance_locked?: number
          balance_pending?: number
          created_at?: string
          id?: string
          last_withdrawal_at?: string | null
          metadata?: Json
          minimum_withdrawal?: number
          provider_id?: string
          source_id?: string | null
          source_type?: string | null
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_wallet_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_wallet_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          daftra_item_id: string | null
          document_id: string
          id: string
          notes: string | null
          product_description: string | null
          product_name: string
          quantity: number | null
          rejection_reason: string | null
          total_price: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          daftra_item_id?: string | null
          document_id: string
          id?: string
          notes?: string | null
          product_description?: string | null
          product_name: string
          quantity?: number | null
          rejection_reason?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          daftra_item_id?: string | null
          document_id?: string
          id?: string
          notes?: string | null
          product_description?: string | null
          product_name?: string
          quantity?: number | null
          rejection_reason?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_items: {
        Row: {
          after_hours_hourly: number | null
          created_at: string
          id: number
          min_billable_hours: number | null
          min_invoice: number | null
          normal_hourly: number | null
          notes: string | null
          rate_card_id: string | null
          trade_id: number | null
          trip_charge: number | null
          updated_at: string
        }
        Insert: {
          after_hours_hourly?: number | null
          created_at?: string
          id?: number
          min_billable_hours?: number | null
          min_invoice?: number | null
          normal_hourly?: number | null
          notes?: string | null
          rate_card_id?: string | null
          trade_id?: number | null
          trip_charge?: number | null
          updated_at?: string
        }
        Update: {
          after_hours_hourly?: number | null
          created_at?: string
          id?: number
          min_billable_hours?: number | null
          min_invoice?: number | null
          normal_hourly?: number | null
          notes?: string | null
          rate_card_id?: string | null
          trade_id?: number | null
          trip_charge?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      request_approvals: {
        Row: {
          approval_type: string
          approved_at: string | null
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_type: string
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          request_id: string
          status: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string
          assigned_by: string | null
          assignment_role: string
          completed_at: string | null
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json
          notes: string | null
          provider_id: string
          request_id: string
          source_id: string | null
          source_type: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assignment_role?: string
          completed_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          provider_id: string
          request_id: string
          source_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assignment_role?: string
          completed_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          provider_id?: string
          request_id?: string
          source_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      request_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          notes: string | null
          occurred_at: string
          request_id: string
          source_id: string | null
          source_type: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          request_id: string
          source_id?: string | null
          source_type?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          request_id?: string
          source_id?: string | null
          source_type?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      request_lifecycle: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          request_id: string
          status: Database["public"]["Enums"]["maintenance_status"]
          update_notes: string | null
          update_type: Database["public"]["Enums"]["update_type"]
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          request_id: string
          status: Database["public"]["Enums"]["maintenance_status"]
          update_notes?: string | null
          update_type: Database["public"]["Enums"]["update_type"]
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          request_id?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          update_notes?: string | null
          update_type?: Database["public"]["Enums"]["update_type"]
          updated_by?: string | null
        }
        Relationships: []
      }
      request_public_events: {
        Row: {
          event_id: string
          from_stage: string | null
          occurred_at: string
          request_id: string
          to_stage: string | null
        }
        Insert: {
          event_id: string
          from_stage?: string | null
          occurred_at: string
          request_id: string
          to_stage?: string | null
        }
        Update: {
          event_id?: string
          from_stage?: string | null
          occurred_at?: string
          request_id?: string
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_public_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "request_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      request_public_tracking: {
        Row: {
          branch_name: string | null
          channel: string | null
          created_at: string | null
          location: string | null
          priority: string | null
          rating: number | null
          request_id: string
          request_number: string
          service_type: string | null
          sla_due_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          updated_projection_at: string
          workflow_stage: string | null
        }
        Insert: {
          branch_name?: string | null
          channel?: string | null
          created_at?: string | null
          location?: string | null
          priority?: string | null
          rating?: number | null
          request_id: string
          request_number: string
          service_type?: string | null
          sla_due_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_projection_at?: string
          workflow_stage?: string | null
        }
        Update: {
          branch_name?: string | null
          channel?: string | null
          created_at?: string | null
          location?: string | null
          priority?: string | null
          rating?: number | null
          request_id?: string
          request_number?: string
          service_type?: string | null
          sla_due_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_projection_at?: string
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_public_tracking_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_tracking_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_tracking_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_public_tracking_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          images: string[] | null
          provider_id: string
          rating: number
          request_id: string | null
          technician_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          images?: string[] | null
          provider_id: string
          rating: number
          request_id?: string | null
          technician_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          images?: string[] | null
          provider_id?: string
          rating?: number
          request_id?: string | null
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_review_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "pending_technician_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          resource: string
          role: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          resource: string
          role: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          resource?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          source_key: string
          source_type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          source_key: string
          source_type?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          source_key?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          auth_user_id: string | null
          availability_status: string | null
          created_at: string
          current_location: unknown
          display_name: string
          email: string | null
          engagement_type: string
          entity_type: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          legal_name: string | null
          location_updated_at: string | null
          phone: string | null
          primary_source_id: string
          primary_source_type: string
          profile_image: string | null
          provider_kind: string
          rating: number | null
          source_data: Json
          specialization_summary: string | null
          standard_rate: number | null
          status: string
          tenant_company_id: string | null
          total_reviews: number
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          visit_fee: number | null
        }
        Insert: {
          auth_user_id?: string | null
          availability_status?: string | null
          created_at?: string
          current_location?: unknown
          display_name: string
          email?: string | null
          engagement_type: string
          entity_type: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          legal_name?: string | null
          location_updated_at?: string | null
          phone?: string | null
          primary_source_id: string
          primary_source_type: string
          profile_image?: string | null
          provider_kind: string
          rating?: number | null
          source_data?: Json
          specialization_summary?: string | null
          standard_rate?: number | null
          status?: string
          tenant_company_id?: string | null
          total_reviews?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visit_fee?: number | null
        }
        Update: {
          auth_user_id?: string | null
          availability_status?: string | null
          created_at?: string
          current_location?: unknown
          display_name?: string
          email?: string | null
          engagement_type?: string
          entity_type?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          legal_name?: string | null
          location_updated_at?: string | null
          phone?: string | null
          primary_source_id?: string
          primary_source_type?: string
          profile_image?: string | null
          provider_kind?: string
          rating?: number | null
          source_data?: Json
          specialization_summary?: string | null
          standard_rate?: number | null
          status?: string
          tenant_company_id?: string | null
          total_reviews?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visit_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_tenant_company_id_fkey"
            columns: ["tenant_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          legacy_id: number | null
          name: string
          sort_order: number
          source_key: string
          source_type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          name: string
          sort_order?: number
          source_key: string
          source_type: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          legacy_id?: number | null
          name?: string
          sort_order?: number
          source_key?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_id_fkey1"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barcode: string | null
          base_price: number | null
          category_id: string | null
          code: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          duration_hours: number | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          legacy_service_item_id: number | null
          max_qty: number | null
          min_qty: number | null
          name: string | null
          name_ar: string
          name_en: string | null
          pricing_type: string
          sku: string | null
          sort_order: number | null
          source_key: string
          source_type: string
          subcategory_id: string | null
          unit: string | null
          updated_at: string | null
          vat_rate: number
          withholding_rate: number
        }
        Insert: {
          barcode?: string | null
          base_price?: number | null
          category_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_hours?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          legacy_service_item_id?: number | null
          max_qty?: number | null
          min_qty?: number | null
          name?: string | null
          name_ar: string
          name_en?: string | null
          pricing_type?: string
          sku?: string | null
          sort_order?: number | null
          source_key: string
          source_type: string
          subcategory_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vat_rate?: number
          withholding_rate?: number
        }
        Update: {
          barcode?: string | null
          base_price?: number | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_hours?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          legacy_service_item_id?: number | null
          max_qty?: number | null
          min_qty?: number | null
          name?: string | null
          name_ar?: string
          name_en?: string | null
          pricing_type?: string
          sku?: string | null
          sort_order?: number | null
          source_key?: string
          source_type?: string
          subcategory_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vat_rate?: number
          withholding_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          accept_within_min: number
          arrive_within_min: number
          category_id: string | null
          complete_within_min: number
          created_at: string | null
          id: string
          priority: string
          updated_at: string
        }
        Insert: {
          accept_within_min: number
          arrive_within_min: number
          category_id?: string | null
          complete_within_min: number
          created_at?: string | null
          id?: string
          priority: string
          updated_at?: string
        }
        Update: {
          accept_within_min?: number
          arrive_within_min?: number
          category_id?: string | null
          complete_within_min?: number
          created_at?: string | null
          id?: string
          priority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      specialization_icons: {
        Row: {
          color: string | null
          created_at: string
          icon_path: string
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon_path: string
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon_path?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          area: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_deleted: boolean | null
          location: string | null
          map_url: string | null
          name: string
          opening_date: string | null
          phone: string | null
          region_id: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          area?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          location?: string | null
          map_url?: string | null
          name: string
          opening_date?: string | null
          phone?: string | null
          region_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          area?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          location?: string | null
          map_url?: string | null
          name?: string
          opening_date?: string | null
          phone?: string | null
          region_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      supcloud_keepalive: {
        Row: {
          id: number
          marker: string
        }
        Insert: {
          id: number
          marker?: string
        }
        Update: {
          id?: number
          marker?: string
        }
        Relationships: []
      }
      ufbot_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ufbot_knowledge_entries: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          question: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ufbot_knowledge_files: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_active: boolean
          text_content: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          is_active?: boolean
          text_content?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean
          text_content?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wa_api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          project_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          project_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          project_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_contacts: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          last_seen_at: string | null
          phone: string
          project_id: string
          updated_at: string
          wa_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone: string
          project_id: string
          updated_at?: string
          wa_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string
          project_id?: string
          updated_at?: string
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          assigned_to: string | null
          collected_data: Json | null
          contact_id: string
          conversation_state: string
          created_at: string | null
          current_request_id: string | null
          id: string
          last_message_at: string | null
          messages_history: Json | null
          phone_number_id: string | null
          project_id: string
          sender_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          collected_data?: Json | null
          contact_id: string
          conversation_state?: string
          created_at?: string | null
          current_request_id?: string | null
          id?: string
          last_message_at?: string | null
          messages_history?: Json | null
          phone_number_id?: string | null
          project_id: string
          sender_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          collected_data?: Json | null
          contact_id?: string
          conversation_state?: string
          created_at?: string | null
          current_request_id?: string | null
          id?: string
          last_message_at?: string | null
          messages_history?: Json | null
          phone_number_id?: string | null
          project_id?: string
          sender_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_current_request_id_fkey"
            columns: ["current_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_current_request_id_fkey"
            columns: ["current_request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_current_request_id_fkey"
            columns: ["current_request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_current_request_id_fkey"
            columns: ["current_request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_flows: {
        Row: {
          created_at: string | null
          flow_json: Json | null
          id: string
          meta_flow_id: string | null
          name: string
          project_id: string
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          flow_json?: Json | null
          id?: string
          meta_flow_id?: string | null
          name: string
          project_id: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          flow_json?: Json | null
          id?: string
          meta_flow_id?: string | null
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_flows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_media: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          filename: string | null
          id: string
          media_type: string | null
          message_id: string | null
          mime_type: string | null
          phone_number_id: string | null
          project_id: string
          received_at: string | null
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          filename?: string | null
          id?: string
          media_type?: string | null
          message_id?: string | null
          mime_type?: string | null
          phone_number_id?: string | null
          project_id: string
          received_at?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          filename?: string | null
          id?: string
          media_type?: string | null
          message_id?: string | null
          mime_type?: string | null
          phone_number_id?: string | null
          project_id?: string
          received_at?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "wa_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          body: string | null
          contact_id: string | null
          contact_name: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          media_id: string | null
          meta_message_id: string | null
          msg_type: string | null
          phone: string | null
          project_id: string
          status: string | null
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          media_id?: string | null
          meta_message_id?: string | null
          msg_type?: string | null
          phone?: string | null
          project_id: string
          status?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          media_id?: string | null
          meta_message_id?: string | null
          msg_type?: string | null
          phone?: string | null
          project_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_numbers: {
        Row: {
          activated_at: string | null
          activation_code: string | null
          created_at: string | null
          display_number: string
          id: string
          number_type: string | null
          phone_number_id: string | null
          project_id: string
          status: string | null
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_code?: string | null
          created_at?: string | null
          display_number: string
          id?: string
          number_type?: string | null
          phone_number_id?: string | null
          project_id: string
          status?: string | null
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_code?: string | null
          created_at?: string | null
          display_number?: string
          id?: string
          number_type?: string | null
          phone_number_id?: string | null
          project_id?: string
          status?: string | null
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_numbers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wa_stage_template_map: {
        Row: {
          created_at: string
          fallback_template_key: string | null
          id: string
          is_active: boolean
          language: string
          priority: number
          stage: Database["public"]["Enums"]["workflow_stage_t"]
          template_id: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fallback_template_key?: string | null
          id?: string
          is_active?: boolean
          language?: string
          priority?: number
          stage: Database["public"]["Enums"]["workflow_stage_t"]
          template_id?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fallback_template_key?: string | null
          id?: string
          is_active?: boolean
          language?: string
          priority?: number
          stage?: Database["public"]["Enums"]["workflow_stage_t"]
          template_id?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_stage_template_map_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_wa_templates_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_stage_template_map_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_template_events: {
        Row: {
          actor_id: string | null
          correlation_id: string | null
          created_at: string
          error_message: string | null
          event_source: string
          event_type: string
          id: string
          metadata: Json | null
          new_quality: Database["public"]["Enums"]["wa_template_quality"] | null
          new_status: Database["public"]["Enums"]["wa_template_status"] | null
          old_quality: Database["public"]["Enums"]["wa_template_quality"] | null
          old_status: Database["public"]["Enums"]["wa_template_status"] | null
          template_id: string
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          event_source?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_quality?:
            | Database["public"]["Enums"]["wa_template_quality"]
            | null
          new_status?: Database["public"]["Enums"]["wa_template_status"] | null
          old_quality?:
            | Database["public"]["Enums"]["wa_template_quality"]
            | null
          old_status?: Database["public"]["Enums"]["wa_template_status"] | null
          template_id: string
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          event_source?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_quality?:
            | Database["public"]["Enums"]["wa_template_quality"]
            | null
          new_status?: Database["public"]["Enums"]["wa_template_status"] | null
          old_quality?:
            | Database["public"]["Enums"]["wa_template_quality"]
            | null
          old_status?: Database["public"]["Enums"]["wa_template_status"] | null
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_wa_templates_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_templates: {
        Row: {
          approved_at: string | null
          body_text: string
          buttons: Json | null
          category: Database["public"]["Enums"]["wa_template_category"]
          components: Json | null
          created_at: string
          created_by: string | null
          footer_text: string | null
          header_content: string | null
          header_media_url: string | null
          header_type: string | null
          id: string
          is_locked: boolean
          language: string
          meta_template_id: string | null
          meta_template_name: string | null
          name: string
          quality: Database["public"]["Enums"]["wa_template_quality"] | null
          quality_reason: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["wa_template_status"]
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          body_text: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["wa_template_category"]
          components?: Json | null
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_media_url?: string | null
          header_type?: string | null
          id?: string
          is_locked?: boolean
          language?: string
          meta_template_id?: string | null
          meta_template_name?: string | null
          name: string
          quality?: Database["public"]["Enums"]["wa_template_quality"] | null
          quality_reason?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"]
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          body_text?: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["wa_template_category"]
          components?: Json | null
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_media_url?: string | null
          header_type?: string | null
          id?: string
          is_locked?: boolean
          language?: string
          meta_template_id?: string | null
          meta_template_name?: string | null
          name?: string
          quality?: Database["public"]["Enums"]["wa_template_quality"] | null
          quality_reason?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"]
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      wa_webhooks: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          events: string[] | null
          id: string
          project_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          events?: string[] | null
          id?: string
          project_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          events?: string[] | null
          id?: string
          project_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "wa_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_media_storage: {
        Row: {
          caption: string | null
          created_at: string | null
          direction: string | null
          file_size: number | null
          file_type: string
          from_phone: string
          id: string
          media_id: string
          message_id: string | null
          metadata: Json | null
          mime_type: string | null
          original_filename: string | null
          processed_at: string | null
          s3_bucket: string | null
          s3_key: string
          s3_url: string | null
          sha256_hash: string | null
          status: string | null
          updated_at: string | null
          whatsapp_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          direction?: string | null
          file_size?: number | null
          file_type: string
          from_phone: string
          id?: string
          media_id: string
          message_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          processed_at?: string | null
          s3_bucket?: string | null
          s3_key: string
          s3_url?: string | null
          sha256_hash?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          direction?: string | null
          file_size?: number | null
          file_type?: string
          from_phone?: string
          id?: string
          media_id?: string
          message_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          processed_at?: string | null
          s3_bucket?: string | null
          s3_key?: string
          s3_url?: string | null
          sha256_hash?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      whatsapp_otp: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          phone?: string
        }
        Relationships: []
      }
      workflow_transitions: {
        Row: {
          created_at: string
          from_stage: Database["public"]["Enums"]["workflow_stage_t"]
          guard_fn: string | null
          id: string
          is_active: boolean
          required_role: string | null
          to_stage: Database["public"]["Enums"]["workflow_stage_t"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_stage: Database["public"]["Enums"]["workflow_stage_t"]
          guard_fn?: string | null
          id?: string
          is_active?: boolean
          required_role?: string | null
          to_stage: Database["public"]["Enums"]["workflow_stage_t"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_stage?: Database["public"]["Enums"]["workflow_stage_t"]
          guard_fn?: string | null
          id?: string
          is_active?: boolean
          required_role?: string | null
          to_stage?: Database["public"]["Enums"]["workflow_stage_t"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      api_consumers_safe: {
        Row: {
          auth_type: string | null
          channel: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_used_at: string | null
          name: string | null
          rate_limit_per_minute: number | null
          scopes: string[] | null
          storage_target: string | null
          total_requests: number | null
        }
        Insert: {
          auth_type?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
          storage_target?: string | null
          total_requests?: number | null
        }
        Update: {
          auth_type?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
          storage_target?: string | null
          total_requests?: number | null
        }
        Relationships: []
      }
      api_gateway_logs_masked: {
        Row: {
          client_ip_masked: string | null
          consumer_id: string | null
          consumer_type: string | null
          created_at: string | null
          duration_ms: number | null
          id: string | null
          method: string | null
          request_body_safe: string | null
          request_id: string | null
          response_size: number | null
          route: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          client_ip_masked?: never
          consumer_id?: string | null
          consumer_type?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string | null
          method?: string | null
          request_body_safe?: never
          request_id?: string | null
          response_size?: number | null
          route?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          client_ip_masked?: never
          consumer_id?: string | null
          consumer_type?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string | null
          method?: string | null
          request_body_safe?: never
          request_id?: string | null
          response_size?: number | null
          route?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      app_settings_admin_safe: {
        Row: {
          allow_edit_after_start: boolean | null
          allow_self_registration: boolean | null
          allow_technician_quotes: boolean | null
          app_logo_url: string | null
          app_name: string | null
          auto_backup_enabled: boolean | null
          background_color: string | null
          backup_frequency: string | null
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          created_at: string | null
          custom_css: string | null
          default_currency: string | null
          default_language: string | null
          enable_2fa: boolean | null
          enable_email_notifications: boolean | null
          enable_in_app_notifications: boolean | null
          enable_reminders: boolean | null
          enable_sms_notifications: boolean | null
          enable_technician_rating: boolean | null
          erpnext_enabled: boolean | null
          erpnext_url: string | null
          google_maps_enabled: boolean | null
          id: string | null
          lock_sensitive_settings: boolean | null
          map_style: string | null
          max_execution_time: number | null
          notification_templates: Json | null
          notification_types: Json | null
          primary_color: string | null
          require_manager_approval: boolean | null
          secondary_color: string | null
          session_timeout: number | null
          show_footer: boolean | null
          show_technicians_on_map: boolean | null
          theme_mode: string | null
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          erpnext_url?: string | null
          google_maps_enabled?: boolean | null
          id?: string | null
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          erpnext_url?: string | null
          google_maps_enabled?: boolean | null
          id?: string | null
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings_public_safe: {
        Row: {
          app_logo_url: string | null
          app_name: string | null
          background_color: string | null
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          default_currency: string | null
          default_language: string | null
          enable_technician_rating: boolean | null
          google_maps_enabled: boolean | null
          id: string | null
          map_style: string | null
          primary_color: string | null
          secondary_color: string | null
          show_footer: boolean | null
          show_technicians_on_map: boolean | null
          theme_mode: string | null
          timezone: string | null
        }
        Insert: {
          app_logo_url?: string | null
          app_name?: string | null
          background_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_technician_rating?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          map_style?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
        }
        Update: {
          app_logo_url?: string | null
          app_name?: string | null
          background_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_technician_rating?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          map_style?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      app_settings_safe: {
        Row: {
          allow_self_registration: boolean | null
          app_logo_url: string | null
          app_name: string | null
          background_color: string | null
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          default_currency: string | null
          default_language: string | null
          enable_email_notifications: boolean | null
          enable_in_app_notifications: boolean | null
          enable_sms_notifications: boolean | null
          enable_technician_rating: boolean | null
          google_maps_enabled: boolean | null
          id: string | null
          map_style: string | null
          primary_color: string | null
          require_manager_approval: boolean | null
          secondary_color: string | null
          show_footer: boolean | null
          show_technicians_on_map: boolean | null
          theme_mode: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          allow_self_registration?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          background_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          map_style?: string | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_self_registration?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          background_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          map_style?: string | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments_public_safe: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          created_at: string | null
          customer_name_masked: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          location: string | null
          maintenance_request_id: string | null
          notes: string | null
          property_id: string | null
          reminder_sent: boolean | null
          status: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          created_at?: string | null
          customer_name_masked?: never
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          property_id?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          created_at?: string | null
          customer_name_masked?: never
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          property_id?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments_safe: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          location: string | null
          maintenance_request_id: string | null
          notes: string | null
          property_address: string | null
          property_id: string | null
          property_name: string | null
          reminder_sent: boolean | null
          status: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_specialization: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices_safe: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          due_date: string | null
          eta_long_id: string | null
          eta_status: string | null
          eta_submitted_at: string | null
          eta_uuid: string | null
          id: string | null
          invoice_number: string | null
          is_locked: boolean | null
          issue_date: string | null
          last_modified_by: string | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          due_date?: string | null
          eta_long_id?: string | null
          eta_status?: string | null
          eta_submitted_at?: string | null
          eta_uuid?: string | null
          id?: string | null
          invoice_number?: string | null
          is_locked?: boolean | null
          issue_date?: string | null
          last_modified_by?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          due_date?: string | null
          eta_long_id?: string | null
          eta_status?: string | null
          eta_submitted_at?: string | null
          eta_uuid?: string | null
          id?: string | null
          invoice_number?: string | null
          is_locked?: boolean | null
          issue_date?: string | null
          last_modified_by?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      maintenance_contracts_safe: {
        Row: {
          auto_renew: boolean | null
          billing_type:
            | Database["public"]["Enums"]["contract_billing_type"]
            | null
          branch_id: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string | null
          contract_number: string | null
          contract_value: number | null
          covered_services: string[] | null
          created_at: string | null
          created_by: string | null
          discount_percentage: number | null
          end_date: string | null
          excluded_services: string[] | null
          id: string | null
          includes_parts: boolean | null
          max_requests: number | null
          property_id: string | null
          sla_resolution_hours: number | null
          sla_response_hours: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          title: string | null
          updated_at: string | null
          used_requests: number | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_type?:
            | Database["public"]["Enums"]["contract_billing_type"]
            | null
          branch_id?: string | null
          client_email?: never
          client_name?: never
          client_phone?: never
          company_id?: string | null
          contract_number?: string | null
          contract_value?: number | null
          covered_services?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          excluded_services?: string[] | null
          id?: string | null
          includes_parts?: boolean | null
          max_requests?: number | null
          property_id?: string | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          title?: string | null
          updated_at?: string | null
          used_requests?: number | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_type?:
            | Database["public"]["Enums"]["contract_billing_type"]
            | null
          branch_id?: string | null
          client_email?: never
          client_name?: never
          client_phone?: never
          company_id?: string | null
          contract_number?: string | null
          contract_value?: number | null
          covered_services?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          excluded_services?: string[] | null
          id?: string | null
          includes_parts?: boolean | null
          max_requests?: number | null
          property_id?: string | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          title?: string | null
          updated_at?: string | null
          used_requests?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string | null
          message_content: string | null
          message_type: string | null
          metadata: Json | null
          notification_stage: string | null
          provider: string | null
          read_at: string | null
          recipient: string | null
          request_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string | null
          message_content?: string | null
          message_type?: string | null
          metadata?: Json | null
          notification_stage?: never
          provider?: never
          read_at?: string | null
          recipient?: string | null
          request_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string | null
          message_content?: string | null
          message_type?: string | null
          metadata?: Json | null
          notification_stage?: never
          provider?: never
          read_at?: string | null
          recipient?: string | null
          request_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          parent_message_id: string | null
          recipient_id: string | null
          sender_id: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          parent_message_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          parent_message_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "_legacy_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          build_id: string | null
          created_at: string | null
          id: string | null
          link: string | null
          message: string | null
          platform: string | null
          read: boolean | null
          title: string | null
          type: string | null
        }
        Insert: {
          build_id?: string | null
          created_at?: string | null
          id?: string | null
          link?: string | null
          message?: string | null
          platform?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Update: {
          build_id?: string | null
          created_at?: string | null
          id?: string | null
          link?: string | null
          message?: string | null
          platform?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      notification_stats_daily: {
        Row: {
          count: number | null
          date: string | null
          delivered_count: number | null
          failed_count: number | null
          message_type: string | null
          read_count: number | null
          sent_count: number | null
          status: string | null
        }
        Relationships: []
      }
      pending_technician_registrations: {
        Row: {
          company_name: string | null
          company_type: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          profile_data: Json | null
        }
        Insert: {
          company_name?: never
          company_type?: never
          created_at?: string | null
          email?: string | null
          expires_at?: never
          full_name?: string | null
          id?: string | null
          phone?: string | null
          profile_data?: Json | null
        }
        Update: {
          company_name?: never
          company_type?: never
          created_at?: string | null
          email?: string | null
          expires_at?: never
          full_name?: string | null
          id?: string | null
          phone?: string | null
          profile_data?: Json | null
        }
        Relationships: []
      }
      profiles_minimal_public: {
        Row: {
          id: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      profiles_names_only: {
        Row: {
          full_name: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      profiles_public_safe: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          full_name: string | null
          id: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          full_name?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          full_name?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties_qr_public: {
        Row: {
          city_id: number | null
          code: string | null
          district_id: number | null
          id: string | null
          name: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          city_id?: number | null
          code?: string | null
          district_id?: number | null
          id?: string | null
          name?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          city_id?: number | null
          code?: string | null
          district_id?: number | null
          id?: string | null
          name?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_badges: {
        Row: {
          awarded_at: string | null
          awarded_for: string | null
          badge_description: string | null
          badge_title: string | null
          badge_type: string | null
          created_at: string | null
          id: string | null
          technician_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_for?: string | null
          badge_description?: string | null
          badge_title?: string | null
          badge_type?: string | null
          created_at?: string | null
          id?: string | null
          technician_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_for?: string | null
          badge_description?: string | null
          badge_title?: string | null
          badge_type?: string | null
          created_at?: string | null
          id?: string | null
          technician_id?: string | null
        }
        Relationships: []
      }
      technician_daily_stats: {
        Row: {
          average_arrival_time: number | null
          average_rating: number | null
          average_response_time: number | null
          complaints_received: number | null
          created_at: string | null
          date: string | null
          id: string | null
          technician_id: string | null
          total_earnings: number | null
          updated_at: string | null
          visits_accepted: number | null
          visits_assigned: number | null
          visits_cancelled: number | null
          visits_completed: number | null
          visits_rejected: number | null
        }
        Insert: {
          average_arrival_time?: number | null
          average_rating?: number | null
          average_response_time?: number | null
          complaints_received?: number | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          technician_id?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          visits_accepted?: number | null
          visits_assigned?: number | null
          visits_cancelled?: number | null
          visits_completed?: number | null
          visits_rejected?: number | null
        }
        Update: {
          average_arrival_time?: number | null
          average_rating?: number | null
          average_response_time?: number | null
          complaints_received?: number | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          technician_id?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          visits_accepted?: number | null
          visits_assigned?: number | null
          visits_cancelled?: number | null
          visits_completed?: number | null
          visits_rejected?: number | null
        }
        Relationships: []
      }
      technician_levels: {
        Row: {
          created_at: string | null
          current_level: string | null
          id: string | null
          level_updated_at: string | null
          promotion_history: Json | null
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: string | null
          id?: string | null
          level_updated_at?: string | null
          promotion_history?: Json | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: string | null
          id?: string | null
          level_updated_at?: string | null
          promotion_history?: Json | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      technician_performance: {
        Row: {
          average_rating: number | null
          cancelled_tasks: number | null
          complaints_count: number | null
          completed_tasks: number | null
          created_at: string | null
          excellence_count: number | null
          id: string | null
          last_calculated_at: string | null
          professionalism_score: number | null
          punctuality_score: number | null
          quality_score: number | null
          technician_id: string | null
          total_points: number | null
          total_tasks: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          cancelled_tasks?: number | null
          complaints_count?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          excellence_count?: number | null
          id?: string | null
          last_calculated_at?: string | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          quality_score?: number | null
          technician_id?: string | null
          total_points?: number | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          cancelled_tasks?: number | null
          complaints_count?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          excellence_count?: number | null
          id?: string | null
          last_calculated_at?: string | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          quality_score?: number | null
          technician_id?: string | null
          total_points?: number | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      technician_profiles: {
        Row: {
          additional_notes: string | null
          approved_at: string | null
          approved_by: string | null
          city_id: number | null
          company_name: string | null
          company_type: string | null
          country: string | null
          created_at: string | null
          district_id: number | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          preferred_language: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          street_address: string | null
          submitted_at: string | null
          technician_code: string | null
          technician_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      technician_profiles_public_safe: {
        Row: {
          city_id: number | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          phone: string | null
          status: string | null
        }
        Relationships: []
      }
      technician_profiles_safe: {
        Row: {
          city_id: number | null
          created_at: string | null
          district_id: number | null
          full_name: string | null
          id: string | null
          status: string | null
        }
        Relationships: []
      }
      technician_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          net_amount: number | null
          platform_fee: number | null
          request_id: string | null
          status: string | null
          technician_id: string | null
          transaction_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_wallet: {
        Row: {
          balance_current: number | null
          balance_locked: number | null
          balance_pending: number | null
          created_at: string | null
          id: string | null
          last_withdrawal_at: string | null
          minimum_withdrawal: number | null
          technician_id: string | null
          total_earnings: number | null
          total_withdrawn: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      technicians: {
        Row: {
          application_id: string | null
          available_from: string | null
          available_to: string | null
          bio: string | null
          certifications: Json | null
          city_id: number | null
          code: string | null
          company_id: string | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          current_latitude: number | null
          current_longitude: number | null
          district_id: number | null
          email: string | null
          hourly_rate: number | null
          icon_url: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          lat: number | null
          level: string | null
          lng: number | null
          location_updated_at: string | null
          name: string | null
          phone: string | null
          primary_service_id: string | null
          profile_image: string | null
          rating: number | null
          service_area_radius: number | null
          specialization: string | null
          standard_rate: number | null
          status: string | null
          technician_number: string | null
          technician_profile_id: string | null
          total_reviews: number | null
          updated_at: string | null
          verification_center_id: string | null
          verification_notes: string | null
          verified_at: string | null
          visit_fee: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_tenant_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians_map_public: {
        Row: {
          available_from: string | null
          available_to: string | null
          bio: string | null
          current_latitude: number | null
          current_longitude: number | null
          hourly_rate: number | null
          icon_url: string | null
          id: string | null
          is_verified: boolean | null
          level: string | null
          location_updated_at: string | null
          name: string | null
          rating: number | null
          service_area_radius: number | null
          specialization: string | null
          status: string | null
          total_reviews: number | null
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          bio?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          hourly_rate?: number | null
          icon_url?: string | null
          id?: string | null
          is_verified?: boolean | null
          level?: string | null
          location_updated_at?: string | null
          name?: string | null
          rating?: number | null
          service_area_radius?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          bio?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          hourly_rate?: number | null
          icon_url?: string | null
          id?: string | null
          is_verified?: boolean | null
          level?: string | null
          location_updated_at?: string | null
          name?: string | null
          rating?: number | null
          service_area_radius?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      technicians_public: {
        Row: {
          current_latitude: number | null
          current_longitude: number | null
          icon_url: string | null
          id: string | null
          is_active: boolean | null
          level: string | null
          name: string | null
          profile_image: string | null
          rating: number | null
          specialization: string | null
          status: string | null
          total_reviews: number | null
        }
        Insert: {
          current_latitude?: number | null
          current_longitude?: number | null
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: string | null
          name?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Update: {
          current_latitude?: number | null
          current_longitude?: number | null
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: string | null
          name?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      technicians_public_safe: {
        Row: {
          icon_url: string | null
          id: string | null
          is_active: boolean | null
          lat_approx: number | null
          level: string | null
          lng_approx: number | null
          name: string | null
          profile_image: string | null
          rating: number | null
          specialization: string | null
          status: string | null
          total_reviews: number | null
        }
        Insert: {
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          lat_approx?: never
          level?: string | null
          lng_approx?: never
          name?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Update: {
          icon_url?: string | null
          id?: string | null
          is_active?: boolean | null
          lat_approx?: never
          level?: string | null
          lng_approx?: never
          name?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: string | null
          status?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      v_ai_usage_dashboard: {
        Row: {
          channel: string | null
          completion_tokens: number | null
          day: string | null
          errors: number | null
          model: string | null
          prompt_tokens: number | null
          sessions: number | null
          tool_invocations: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      v_api_consumers_dashboard: {
        Row: {
          activity_state: string | null
          allowed_origins: string[] | null
          api_key_prefix: string | null
          auth_type: string | null
          channel: string | null
          created_at: string | null
          errors_last_24h: number | null
          id: string | null
          is_active: boolean | null
          last_rotated_at: string | null
          last_used_at: string | null
          name: string | null
          rate_limit_per_minute: number | null
          requests_last_24h: number | null
          requests_last_7d: number | null
          scopes: string[] | null
          storage_target: string | null
          total_requests: number | null
          updated_at: string | null
        }
        Insert: {
          activity_state?: never
          allowed_origins?: string[] | null
          api_key_prefix?: string | null
          auth_type?: string | null
          channel?: string | null
          created_at?: string | null
          errors_last_24h?: never
          id?: string | null
          is_active?: boolean | null
          last_rotated_at?: string | null
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number | null
          requests_last_24h?: never
          requests_last_7d?: never
          scopes?: string[] | null
          storage_target?: string | null
          total_requests?: number | null
          updated_at?: string | null
        }
        Update: {
          activity_state?: never
          allowed_origins?: string[] | null
          api_key_prefix?: string | null
          auth_type?: string | null
          channel?: string | null
          created_at?: string | null
          errors_last_24h?: never
          id?: string | null
          is_active?: boolean | null
          last_rotated_at?: string | null
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number | null
          requests_last_24h?: never
          requests_last_7d?: never
          scopes?: string[] | null
          storage_target?: string | null
          total_requests?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_api_gateway_logs_dashboard: {
        Row: {
          client_ip: unknown
          consumer_channel: string | null
          consumer_id: string | null
          consumer_name: string | null
          consumer_type: string | null
          created_at: string | null
          duration_ms: number | null
          id: string | null
          latency_band: string | null
          method: string | null
          outcome: string | null
          request_id: string | null
          response_size: number | null
          route: string | null
          status_code: number | null
          user_agent: string | null
        }
        Relationships: []
      }
      v_api_webhooks_dashboard: {
        Row: {
          consumer_id: string | null
          consumer_name: string | null
          created_at: string | null
          deliveries_last_24h: number | null
          description: string | null
          endpoint_url: string | null
          event_types: string[] | null
          failure_count: number | null
          failures_last_24h: number | null
          health_state: string | null
          id: string | null
          is_active: boolean | null
          last_delivery_at: string | null
          last_delivery_status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "api_consumers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_webhook_subscriptions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "v_api_consumers_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_app_settings_safe: {
        Row: {
          allow_edit_after_start: boolean | null
          allow_self_registration: boolean | null
          allow_technician_quotes: boolean | null
          app_logo_url: string | null
          app_name: string | null
          auto_backup_enabled: boolean | null
          background_color: string | null
          backup_frequency: string | null
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          created_at: string | null
          custom_css: string | null
          default_currency: string | null
          default_language: string | null
          enable_2fa: boolean | null
          enable_email_notifications: boolean | null
          enable_in_app_notifications: boolean | null
          enable_reminders: boolean | null
          enable_sms_notifications: boolean | null
          enable_technician_rating: boolean | null
          erpnext_enabled: boolean | null
          google_maps_enabled: boolean | null
          id: string | null
          lock_sensitive_settings: boolean | null
          map_style: string | null
          max_execution_time: number | null
          notification_templates: Json | null
          notification_types: Json | null
          primary_color: string | null
          require_manager_approval: boolean | null
          secondary_color: string | null
          session_timeout: number | null
          show_footer: boolean | null
          show_technicians_on_map: boolean | null
          theme_mode: string | null
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_edit_after_start?: boolean | null
          allow_self_registration?: boolean | null
          allow_technician_quotes?: boolean | null
          app_logo_url?: string | null
          app_name?: string | null
          auto_backup_enabled?: boolean | null
          background_color?: string | null
          backup_frequency?: string | null
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          created_at?: string | null
          custom_css?: string | null
          default_currency?: string | null
          default_language?: string | null
          enable_2fa?: boolean | null
          enable_email_notifications?: boolean | null
          enable_in_app_notifications?: boolean | null
          enable_reminders?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_technician_rating?: boolean | null
          erpnext_enabled?: boolean | null
          google_maps_enabled?: boolean | null
          id?: string | null
          lock_sensitive_settings?: boolean | null
          map_style?: string | null
          max_execution_time?: number | null
          notification_templates?: Json | null
          notification_types?: Json | null
          primary_color?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          session_timeout?: number | null
          show_footer?: boolean | null
          show_technicians_on_map?: boolean | null
          theme_mode?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      v_audit_dashboard: {
        Row: {
          action: string | null
          actor_name: string | null
          created_at: string | null
          id: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_bot_sessions_dashboard: {
        Row: {
          bot_source: string | null
          client_phone: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          last_request_id: string | null
          lifecycle_state: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          bot_source?: string | null
          client_phone?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          last_request_id?: string | null
          lifecycle_state?: never
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bot_source?: string | null
          client_phone?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          last_request_id?: string | null
          lifecycle_state?: never
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_last_request_id_fkey"
            columns: ["last_request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_branches_dashboard: {
        Row: {
          active_requests: number | null
          address: string | null
          city: string | null
          code: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          total_requests: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_completed_requests_dashboard: {
        Row: {
          actual_cost: number | null
          assigned_technician_id: string | null
          assigned_vendor_id: string | null
          branch_id: string | null
          client_name: string | null
          closed_at: string | null
          closure_reason: string | null
          company_id: string | null
          created_at: string | null
          estimated_cost: number | null
          feedback_comment: string | null
          handover_to_admin_at: string | null
          handover_to_admin_by: string | null
          id: string | null
          lifecycle_hours: number | null
          location: string | null
          priority: string | null
          property_id: string | null
          rated_at: string | null
          rating: number | null
          request_number: string | null
          service_type: string | null
          sla_met: boolean | null
          stage: Database["public"]["Enums"]["workflow_stage_t"] | null
          title: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_technician_id?: string | null
          assigned_vendor_id?: string | null
          branch_id?: string | null
          client_name?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          feedback_comment?: string | null
          handover_to_admin_at?: string | null
          handover_to_admin_by?: string | null
          id?: string | null
          lifecycle_hours?: never
          location?: string | null
          priority?: string | null
          property_id?: string | null
          rated_at?: string | null
          rating?: number | null
          request_number?: string | null
          service_type?: string | null
          sla_met?: never
          stage?: Database["public"]["Enums"]["workflow_stage_t"] | null
          title?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_technician_id?: string | null
          assigned_vendor_id?: string | null
          branch_id?: string | null
          client_name?: string | null
          closed_at?: string | null
          closure_reason?: string | null
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          feedback_comment?: string | null
          handover_to_admin_at?: string | null
          handover_to_admin_by?: string | null
          id?: string | null
          lifecycle_hours?: never
          location?: string | null
          priority?: string | null
          property_id?: string | null
          rated_at?: string | null
          rating?: number | null
          request_number?: string | null
          service_type?: string | null
          sla_met?: never
          stage?: Database["public"]["Enums"]["workflow_stage_t"] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_qr_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_for_map"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customers_dashboard: {
        Row: {
          avg_rating: number | null
          customer_code: string | null
          email: string | null
          first_seen_at: string | null
          id: string | null
          invoices_count: number | null
          is_active: boolean | null
          last_request_at: string | null
          last_seen_at: string | null
          name: string | null
          phone: string | null
          requests_count: number | null
          total_billed: number | null
          total_outstanding: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_inventory_dashboard: {
        Row: {
          category: string | null
          cost_price: number | null
          id: string | null
          is_active: boolean | null
          item_code: string | null
          name_ar: string | null
          reorder_level: number | null
          selling_price: number | null
          stock_status: string | null
          total_quantity: number | null
          unit: string | null
          vat_rate: number | null
          warehouse_count: number | null
        }
        Relationships: []
      }
      v_invoices_dashboard: {
        Row: {
          amount: number | null
          computed_status: string | null
          created_at: string | null
          currency: string | null
          customer_name: string | null
          discount_amount: number | null
          due_date: string | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          paid_at: string | null
          paid_via_gateway: number | null
          request_id: string | null
          sent_at: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          vat_rate: number | null
          withholding_amount: number | null
        }
        Insert: {
          amount?: number | null
          computed_status?: never
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          paid_at?: string | null
          paid_via_gateway?: never
          request_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          vat_rate?: number | null
          withholding_amount?: number | null
        }
        Update: {
          amount?: number | null
          computed_status?: never
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          paid_at?: string | null
          paid_via_gateway?: never
          request_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          vat_rate?: number | null
          withholding_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_maintenance_mirror: {
        Row: {
          actual_cost: number | null
          age_days: number | null
          archived_at: string | null
          assigned_technician_id: string | null
          assigned_vendor_id: string | null
          branch_id: string | null
          branch_name: string | null
          channel: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string | null
          is_archived: boolean | null
          is_legacy: boolean | null
          is_sla_breached: boolean | null
          legacy_created_by: string | null
          legacy_source: string | null
          legacy_store_id: string | null
          location: string | null
          priority: string | null
          rating: number | null
          request_number: string | null
          service_type: string | null
          sla_due_date: string | null
          status: Database["public"]["Enums"]["mr_status"] | null
          title: string | null
          updated_at: string | null
          workflow_stage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branches_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_module_permissions_dashboard: {
        Row: {
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          module_key: string | null
          module_name: string | null
          role: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          module_key?: string | null
          module_name?: string | null
          role?: string | null
          state?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          module_key?: string | null
          module_name?: string | null
          role?: string | null
          state?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_notifications_dashboard: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          read_at: string | null
          read_state: string | null
          recipient_id: string | null
          sender_id: string | null
          sms_sent: boolean | null
          title: string | null
          type: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          read_at?: string | null
          read_state?: never
          recipient_id?: string | null
          sender_id?: string | null
          sms_sent?: boolean | null
          title?: string | null
          type?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          read_at?: string | null
          read_state?: never
          recipient_id?: string | null
          sender_id?: string | null
          sms_sent?: boolean | null
          title?: string | null
          type?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: []
      }
      v_outbound_messages_dashboard: {
        Row: {
          channel: Database["public"]["Enums"]["message_channel_t"] | null
          created_at: string | null
          delivered_at: string | null
          failed_at: string | null
          id: string | null
          last_error: string | null
          lifecycle_state: string | null
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient: string | null
          related_aggregate_id: string | null
          related_aggregate_type: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status_t"] | null
          template_key: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["message_channel_t"] | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          id?: string | null
          last_error?: string | null
          lifecycle_state?: never
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient?: string | null
          related_aggregate_id?: string | null
          related_aggregate_type?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_t"] | null
          template_key?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["message_channel_t"] | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          id?: string | null
          last_error?: string | null
          lifecycle_state?: never
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient?: string | null
          related_aggregate_id?: string | null
          related_aggregate_type?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_t"] | null
          template_key?: string | null
        }
        Relationships: []
      }
      v_payments_dashboard: {
        Row: {
          amount: number | null
          cart_id: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string | null
          invoice_id: string | null
          invoice_number: string | null
          paid_at: string | null
          provider: string | null
          request_id: string | null
          status: string | null
          tran_ref: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoices_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_completed_requests_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_mirror"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_sla_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_projects_public: {
        Row: {
          actual_end_date: string | null
          company_name: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          gallery_url: string | null
          id: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          magicplan_iframe_url: string | null
          name: string | null
          progress: number | null
          project_type: string | null
          sketch_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          magicplan_iframe_url?: string | null
          name?: string | null
          progress?: number | null
          project_type?: string | null
          sketch_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_url?: string | null
          id?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          magicplan_iframe_url?: string | null
          name?: string | null
          progress?: number | null
          project_type?: string | null
          sketch_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_properties_dashboard: {
        Row: {
          active_requests: number | null
          address: string | null
          city_id: number | null
          code: string | null
          created_at: string | null
          district_id: number | null
          id: string | null
          last_request_at: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          qr_code_data: string | null
          status: string | null
          total_requests: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active_requests?: never
          address?: string | null
          city_id?: number | null
          code?: string | null
          created_at?: string | null
          district_id?: number | null
          id?: string | null
          last_request_at?: never
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          qr_code_data?: string | null
          status?: string | null
          total_requests?: never
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active_requests?: never
          address?: string | null
          city_id?: number | null
          code?: string | null
          created_at?: string | null
          district_id?: number | null
          id?: string | null
          last_request_at?: never
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          qr_code_data?: string | null
          status?: string | null
          total_requests?: never
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_properties_for_map: {
        Row: {
          address: string | null
          code: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          qr_code_data: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          qr_code_data?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          qr_code_data?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      v_reports_overview: {
        Row: {
          active_requests: number | null
          avg_completion_hours: number | null
          cancelled_requests: number | null
          completed_requests: number | null
          month: string | null
          revenue: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      v_reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      v_role_permissions_dashboard: {
        Row: {
          actions: string[] | null
          first_granted_at: string | null
          last_granted_at: string | null
          permission_count: number | null
          resource_count: number | null
          resources: string[] | null
          role: string | null
        }
        Relationships: []
      }
      v_service_catalog_dashboard: {
        Row: {
          base_price: number | null
          code: string | null
          id: string | null
          is_active: boolean | null
          name_ar: string | null
          pricing_type: string | null
          times_invoiced: number | null
          total_revenue: number | null
          unit: string | null
          vat_rate: number | null
          withholding_rate: number | null
        }
        Relationships: []
      }
      v_sla_compliance_summary: {
        Row: {
          completed_late: number | null
          completed_on_time: number | null
          compliance_rate_pct: number | null
          priority: string | null
          total_requests: number | null
          workflow_stage: string | null
        }
        Relationships: []
      }
      v_sla_dashboard: {
        Row: {
          accept_state: string | null
          arrive_state: string | null
          complete_state: string | null
          created_at: string | null
          id: string | null
          overall_sla_state: string | null
          priority: string | null
          request_number: string | null
          sla_accept_due: string | null
          sla_arrive_due: string | null
          sla_complete_due: string | null
          status: Database["public"]["Enums"]["mr_status"] | null
          title: string | null
          workflow_stage: string | null
        }
        Insert: {
          accept_state?: never
          arrive_state?: never
          complete_state?: never
          created_at?: string | null
          id?: string | null
          overall_sla_state?: never
          priority?: string | null
          request_number?: string | null
          sla_accept_due?: string | null
          sla_arrive_due?: string | null
          sla_complete_due?: string | null
          status?: Database["public"]["Enums"]["mr_status"] | null
          title?: string | null
          workflow_stage?: string | null
        }
        Update: {
          accept_state?: never
          arrive_state?: never
          complete_state?: never
          created_at?: string | null
          id?: string | null
          overall_sla_state?: never
          priority?: string | null
          request_number?: string | null
          sla_accept_due?: string | null
          sla_arrive_due?: string | null
          sla_complete_due?: string | null
          status?: Database["public"]["Enums"]["mr_status"] | null
          title?: string | null
          workflow_stage?: string | null
        }
        Relationships: []
      }
      v_technicians_dashboard: {
        Row: {
          approved_at: string | null
          closed_jobs: number | null
          company_name: string | null
          company_type: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          is_active: boolean | null
          is_verified: boolean | null
          phone: string | null
          profile_id: string | null
          rating: number | null
          rejected_at: string | null
          status: string | null
          technician_code: string | null
          technician_id: string | null
          total_jobs: number | null
          total_reviews: number | null
        }
        Relationships: []
      }
      v_user_roles_dashboard: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          id: string | null
          role: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_users_dashboard: {
        Row: {
          activity_state: string | null
          avatar_url: string | null
          department_id: string | null
          display_name: string | null
          email: string | null
          is_deleted: boolean | null
          joined_at: string | null
          last_updated_at: string | null
          phone: string | null
          position: string | null
          role_count: number | null
          roles: string[] | null
          user_id: string | null
        }
        Insert: {
          activity_state?: never
          avatar_url?: string | null
          department_id?: string | null
          display_name?: never
          email?: string | null
          is_deleted?: never
          joined_at?: string | null
          last_updated_at?: string | null
          phone?: string | null
          position?: string | null
          role_count?: never
          roles?: never
          user_id?: string | null
        }
        Update: {
          activity_state?: never
          avatar_url?: string | null
          department_id?: string | null
          display_name?: never
          email?: string | null
          is_deleted?: never
          joined_at?: string | null
          last_updated_at?: string | null
          phone?: string | null
          position?: string | null
          role_count?: never
          roles?: never
          user_id?: string | null
        }
        Relationships: []
      }
      v_wa_templates_dashboard: {
        Row: {
          approved_at: string | null
          category: Database["public"]["Enums"]["wa_template_category"] | null
          created_at: string | null
          id: string | null
          language: string | null
          last_used_at: string | null
          meta_template_name: string | null
          name: string | null
          quality: Database["public"]["Enums"]["wa_template_quality"] | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["wa_template_status"] | null
          submitted_at: string | null
          updated_at: string | null
          used_last_30d: number | null
        }
        Insert: {
          approved_at?: string | null
          category?: Database["public"]["Enums"]["wa_template_category"] | null
          created_at?: string | null
          id?: string | null
          language?: string | null
          last_used_at?: never
          meta_template_name?: string | null
          name?: string | null
          quality?: Database["public"]["Enums"]["wa_template_quality"] | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          used_last_30d?: never
        }
        Update: {
          approved_at?: string | null
          category?: Database["public"]["Enums"]["wa_template_category"] | null
          created_at?: string | null
          id?: string | null
          language?: string | null
          last_used_at?: never
          meta_template_name?: string | null
          name?: string | null
          quality?: Database["public"]["Enums"]["wa_template_quality"] | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          used_last_30d?: never
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          email: string | null
          experience_years: number | null
          id: string | null
          is_tracking_enabled: boolean | null
          last_modified_by: string | null
          location_updated_at: string | null
          map_icon: string | null
          name: string | null
          phone: string | null
          profile_image: string | null
          rating: number | null
          specialization: string[] | null
          status: string | null
          total_jobs: number | null
          tracking_started_at: string | null
          unit_rate: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          address?: never
          company_name?: string | null
          created_at?: string | null
          current_latitude?: never
          current_longitude?: never
          email?: string | null
          experience_years?: number | null
          id?: never
          is_tracking_enabled?: never
          last_modified_by?: never
          location_updated_at?: string | null
          map_icon?: never
          name?: string | null
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: never
          status?: string | null
          total_jobs?: number | null
          tracking_started_at?: never
          unit_rate?: number | null
          updated_at?: string | null
          version?: never
        }
        Update: {
          address?: never
          company_name?: string | null
          created_at?: string | null
          current_latitude?: never
          current_longitude?: never
          email?: string | null
          experience_years?: number | null
          id?: never
          is_tracking_enabled?: never
          last_modified_by?: never
          location_updated_at?: string | null
          map_icon?: never
          name?: string | null
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialization?: never
          status?: string | null
          total_jobs?: number | null
          tracking_started_at?: never
          unit_rate?: number | null
          updated_at?: string | null
          version?: never
        }
        Relationships: []
      }
      vendors_public_safe: {
        Row: {
          address: string | null
          company_name: string | null
          id: string | null
          name: string | null
          rating: number | null
          specialization: string[] | null
          status: string | null
        }
        Insert: {
          address?: never
          company_name?: string | null
          id?: string | null
          name?: string | null
          rating?: number | null
          specialization?: never
          status?: never
        }
        Update: {
          address?: never
          company_name?: string | null
          id?: string | null
          name?: string | null
          rating?: number | null
          specialization?: never
          status?: never
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string | null
          customer_name: string | null
          direction: string | null
          id: string | null
          media_url: string | null
          message_type: string | null
          phone_number: string | null
          status: string | null
          updated_at: string | null
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          direction?: string | null
          id?: string | null
          media_url?: string | null
          message_type?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          direction?: string | null
          id?: string | null
          media_url?: string | null
          message_type?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_technician_profile: {
        Args: { profile_id: string }
        Returns: string
      }
      assign_technician_to_map_request: {
        Args: { p_request_id: string; p_technician_id: string }
        Returns: Json
      }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_sla_deadlines: {
        Args: {
          p_category_id?: string
          p_priority: string
          p_request_id: string
        }
        Returns: undefined
      }
      calculate_sla_due_date: {
        Args: {
          created_at: string
          priority_level: string
          service_type: string
        }
        Returns: string
      }
      can_access_full_appointment: {
        Args: { appointment_id: string }
        Returns: boolean
      }
      can_access_service_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      can_subscribe_realtime_topic: {
        Args: { _topic: string }
        Returns: boolean
      }
      can_transition_stage: {
        Args: { current_stage: string; next_stage: string; user_role: string }
        Returns: boolean
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: number }
      cleanup_old_gateway_logs: { Args: never; Returns: undefined }
      complete_technician_registration: {
        Args: { p_email: string }
        Returns: Json
      }
      create_technician_draft: {
        Args: { fullname: string; phone: string }
        Returns: undefined
      }
      current_user_is_owner: { Args: never; Returns: boolean }
      ensure_current_user_onboarding: {
        Args: {
          p_avatar_url?: string
          p_full_name?: string
          p_phone?: string
          p_requested_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          is_new_user: boolean
          primary_role: Database["public"]["Enums"]["app_role"]
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      find_nearest_vendor: {
        Args: {
          request_latitude: number
          request_longitude: number
          service_specialization?: string
        }
        Returns: {
          distance: number
          email: string
          phone: string
          vendor_id: string
          vendor_name: string
        }[]
      }
      fn_create_api_consumer: {
        Args: {
          p_allowed_origins?: string[]
          p_branch_id?: string
          p_channel?: string
          p_company_id?: string
          p_metadata?: Json
          p_name: string
          p_rate_limit?: number
        }
        Returns: Json
      }
      fn_create_webhook_subscription: {
        Args: {
          p_consumer_id: string
          p_description?: string
          p_endpoint_url: string
          p_event_types: string[]
        }
        Returns: Json
      }
      fn_delete_webhook_subscription: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_derived_request_status: {
        Args: { p_stage: Database["public"]["Enums"]["workflow_stage_t"] }
        Returns: Database["public"]["Enums"]["request_status_canonical"]
      }
      fn_enqueue_whatsapp_for_stage: {
        Args: {
          p_recipient: string
          p_request_id: string
          p_stage: Database["public"]["Enums"]["workflow_stage_t"]
          p_variables?: Json
        }
        Returns: string
      }
      fn_generate_api_key: { Args: never; Returns: string }
      fn_issue_client_secret: { Args: { p_id: string }; Returns: Json }
      fn_revoke_api_consumer: { Args: { p_id: string }; Returns: undefined }
      fn_rotate_api_consumer: { Args: { p_id: string }; Returns: Json }
      fn_toggle_api_consumer: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      fn_toggle_webhook_subscription: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      fn_transition_request_stage: {
        Args: {
          p_actor?: string
          p_metadata?: Json
          p_reason?: string
          p_request_id: string
          p_to_stage: Database["public"]["Enums"]["workflow_stage_t"]
        }
        Returns: Database["public"]["Enums"]["workflow_stage_t"]
      }
      fn_update_api_consumer: {
        Args: {
          p_allowed_origins?: string[]
          p_channel?: string
          p_id: string
          p_metadata?: Json
          p_name?: string
          p_rate_limit?: number
        }
        Returns: undefined
      }
      fn_update_api_consumer_extended: {
        Args: {
          p_auth_type?: string
          p_id: string
          p_scopes?: string[]
          p_storage_target?: string
        }
        Returns: undefined
      }
      generate_unified_serial: {
        Args: { prefix: string; seq_name: string }
        Returns: string
      }
      get_active_requests_for_map: {
        Args: never
        Returns: {
          assigned_technician_id: string
          branch_id: string
          created_at: string
          customer_display: string
          id: string
          is_sla_breached: boolean
          latitude: number
          longitude: number
          priority: string
          property_id: string
          request_number: string
          sla_due_date: string
          workflow_stage: string
        }[]
      }
      get_appointment_contact_info: {
        Args: { appointment_id: string }
        Returns: {
          customer_email: string
          customer_name: string
          customer_phone: string
        }[]
      }
      get_appointment_customer_info: {
        Args: { appointment_id: string }
        Returns: {
          customer_email: string
          customer_name: string
          customer_phone: string
        }[]
      }
      get_appointments_for_staff: {
        Args: never
        Returns: {
          appointment_date: string
          appointment_time: string
          created_at: string
          description: string
          duration_minutes: number
          id: string
          location: string
          maintenance_request_id: string
          notes: string
          property_id: string
          reminder_sent: boolean
          status: string
          title: string
          updated_at: string
          vendor_id: string
        }[]
      }
      get_cities_for_user: {
        Args: { p_user_id: string }
        Returns: {
          city_id: string
          country: string
          name: string
        }[]
      }
      get_current_user_company_id: { Args: never; Returns: string }
      get_customer_contact_info: {
        Args: { appointment_id: string }
        Returns: {
          customer_email: string
          customer_name: string
          customer_phone: string
        }[]
      }
      get_customer_email: { Args: { appointment_id: string }; Returns: string }
      get_customer_name: { Args: { appointment_id: string }; Returns: string }
      get_customer_phone: { Args: { appointment_id: string }; Returns: string }
      get_full_customer_info: {
        Args: { appointment_id: string }
        Returns: {
          customer_email: string
          customer_name: string
          customer_phone: string
        }[]
      }
      get_mr_client_info: {
        Args: { request_id: string }
        Returns: {
          client_email: string
          client_name: string
          client_phone: string
        }[]
      }
      get_provider_id_for_user: { Args: { p_user_id: string }; Returns: string }
      get_public_default_branch_company: {
        Args: never
        Returns: {
          branch_id: string
          branch_name: string
          city: string
          company_id: string
        }[]
      }
      get_public_technicians_for_map: {
        Args: never
        Returns: {
          available_from: string
          available_to: string
          bio: string
          current_latitude: number
          current_longitude: number
          hourly_rate: number
          icon_url: string
          id: string
          is_verified: boolean
          level: string
          location_updated_at: string
          name: string
          rating: number
          service_area_radius: number
          specialization: string
          status: string
          total_reviews: number
        }[]
      }
      get_requests_by_phone: {
        Args: { search_phone: string }
        Returns: {
          client_name: string
          client_phone: string
          created_at: string
          id: string
          location: string
          priority: string
          request_number: string
          service_type: string
          status: string
          title: string
          updated_at: string
          workflow_stage: string
        }[]
      }
      get_safe_app_settings: {
        Args: never
        Returns: {
          app_logo_url: string
          app_name: string
          background_color: string
          company_address: string
          company_email: string
          company_phone: string
          default_currency: string
          default_language: string
          primary_color: string
          secondary_color: string
          theme_mode: string
          timezone: string
        }[]
      }
      get_search_statistics: {
        Args: { project_id_param?: string; search_query: string }
        Returns: {
          avg_relevance: number
          by_file_type: Json
          by_project: Json
          total_results: number
        }[]
      }
      get_smtp_settings: {
        Args: never
        Returns: {
          smtp_from_email: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
        }[]
      }
      get_smtp_settings_secure: {
        Args: never
        Returns: {
          smtp_from_email: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
        }[]
      }
      get_table_row_counts: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      get_technician_id_for_user: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_tenant: { Args: never; Returns: string }
      get_vendor_appointments: {
        Args: never
        Returns: {
          appointment_date: string
          appointment_time: string
          created_at: string
          customer_name: string
          description: string
          duration_minutes: number
          id: string
          location: string
          maintenance_request_id: string
          notes: string
          property_id: string
          reminder_sent: boolean
          status: string
          title: string
          updated_at: string
          vendor_id: string
        }[]
      }
      has_any_role: {
        Args: { p_roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_authorized_owner:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { user_email: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      is_email_confirmed: { Args: never; Returns: boolean }
      is_owner_email: { Args: never; Returns: boolean }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_staff_user: { Args: { _uid: string }; Returns: boolean }
      is_valid_egyptian_phone: { Args: { phone: string }; Returns: boolean }
      mask_pii_text: { Args: { input: string }; Returns: string }
      normalize_eg_phone: { Args: { p: string }; Returns: string }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      public_get_invoice_by_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      public_get_payment_status: {
        Args: { p_request_id: string }
        Returns: Json
      }
      public_get_request_timeline_notes: {
        Args: { p_request_id: string }
        Returns: Json
      }
      public_submit_rating: {
        Args: {
          comment_text?: string
          query_text: string
          rating_value: number
        }
        Returns: Json
      }
      public_track_request: {
        Args: { query_text: string }
        Returns: {
          branch_name: string
          channel: string
          client_name: string
          created_at: string
          description: string
          id: string
          location: string
          priority: string
          rating: number
          request_number: string
          service_type: string
          sla_due_date: string
          status: string
          title: string
          updated_at: string
          workflow_stage: string
        }[]
      }
      recalc_request_totals: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      refresh_notification_stats: { Args: never; Returns: undefined }
      register_technician_profile: {
        Args: {
          p_company_name: string
          p_company_type: string
          p_email: string
          p_full_name: string
          p_password: string
          p_phone: string
          p_profile_data?: Json
        }
        Returns: Json
      }
      search_files: {
        Args: {
          file_type_param?: string
          limit_count?: number
          offset_count?: number
          project_id_param?: string
          search_query: string
        }
        Returns: {
          file_size: number
          file_type: string
          id: string
          original_filename: string
          project_name: string
          relevance_score: number
          storage_url: string
          text_content_preview: string
        }[]
      }
      upsert_customer_from_request: {
        Args: { _email: string; _name: string; _phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "staff"
        | "technician"
        | "vendor"
        | "customer"
        | "warehouse"
        | "accounting"
        | "engineering"
        | "dispatcher"
        | "owner"
        | "finance"
      company_model_enum: "local_provider" | "third_party"
      company_type_enum: "individual" | "small_team" | "company"
      contract_billing_type:
        | "per_request"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
      contract_status:
        | "draft"
        | "active"
        | "expired"
        | "suspended"
        | "cancelled"
      document_type_enum:
        | "tax_card"
        | "commercial_registration"
        | "national_id"
        | "insurance_certificate"
        | "professional_license"
      maintenance_stage:
        | "DRAFT"
        | "SUBMITTED"
        | "TRIAGED"
        | "ASSIGNED"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "INSPECTION"
        | "COMPLETED"
        | "BILLED"
        | "PAID"
        | "CLOSED"
        | "ON_HOLD"
        | "WAITING_PARTS"
        | "CANCELLED"
        | "REJECTED"
      maintenance_status:
        | "draft"
        | "submitted"
        | "acknowledged"
        | "assigned"
        | "scheduled"
        | "in_progress"
        | "inspection"
        | "waiting_parts"
        | "completed"
        | "billed"
        | "paid"
        | "closed"
        | "cancelled"
        | "on_hold"
        | "triaged"
        | "handover_to_admin"
        | "rejected"
      maintenance_status_v2:
        | "submitted"
        | "triaged"
        | "needs_info"
        | "scheduled"
        | "in_progress"
        | "paused"
        | "escalated"
        | "completed"
        | "qa_review"
        | "closed"
        | "reopened"
        | "canceled"
        | "rejected"
      message_channel_t: "whatsapp" | "sms" | "email" | "push" | "in_app"
      message_status_t:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "rejected"
        | "expired"
      mr_status:
        | "Open"
        | "Assigned"
        | "InProgress"
        | "Waiting"
        | "Completed"
        | "Rejected"
        | "Cancelled"
        | "In Progress"
        | "Closed"
        | "On Hold"
      priority_level: "low" | "medium" | "high"
      provider_type_t: "internal_team" | "external_vendor"
      request_status_canonical:
        | "open"
        | "active"
        | "blocked"
        | "done"
        | "terminal"
      request_status_t:
        | "draft"
        | "awaiting_vendor"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      technician_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "active"
        | "suspended"
      update_type:
        | "status_change"
        | "assignment"
        | "scheduling"
        | "cost_estimate"
        | "completion"
        | "feedback"
        | "payment"
        | "note"
      wa_template_category: "utility" | "marketing" | "authentication"
      wa_template_quality: "unknown" | "high" | "medium" | "low"
      wa_template_status:
        | "draft"
        | "submitted"
        | "pending"
        | "approved"
        | "rejected"
        | "paused"
        | "disabled"
        | "deleted"
      wo_status:
        | "Pending"
        | "Scheduled"
        | "EnRoute"
        | "InProgress"
        | "Paused"
        | "Completed"
        | "Cancelled"
      workflow_stage_t:
        | "draft"
        | "submitted"
        | "triaged"
        | "assigned"
        | "scheduled"
        | "in_progress"
        | "inspection"
        | "waiting_parts"
        | "on_hold"
        | "completed"
        | "billed"
        | "paid"
        | "handover_to_admin"
        | "closed"
        | "cancelled"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "staff",
        "technician",
        "vendor",
        "customer",
        "warehouse",
        "accounting",
        "engineering",
        "dispatcher",
        "owner",
        "finance",
      ],
      company_model_enum: ["local_provider", "third_party"],
      company_type_enum: ["individual", "small_team", "company"],
      contract_billing_type: [
        "per_request",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
      ],
      contract_status: ["draft", "active", "expired", "suspended", "cancelled"],
      document_type_enum: [
        "tax_card",
        "commercial_registration",
        "national_id",
        "insurance_certificate",
        "professional_license",
      ],
      maintenance_stage: [
        "DRAFT",
        "SUBMITTED",
        "TRIAGED",
        "ASSIGNED",
        "SCHEDULED",
        "IN_PROGRESS",
        "INSPECTION",
        "COMPLETED",
        "BILLED",
        "PAID",
        "CLOSED",
        "ON_HOLD",
        "WAITING_PARTS",
        "CANCELLED",
        "REJECTED",
      ],
      maintenance_status: [
        "draft",
        "submitted",
        "acknowledged",
        "assigned",
        "scheduled",
        "in_progress",
        "inspection",
        "waiting_parts",
        "completed",
        "billed",
        "paid",
        "closed",
        "cancelled",
        "on_hold",
        "triaged",
        "handover_to_admin",
        "rejected",
      ],
      maintenance_status_v2: [
        "submitted",
        "triaged",
        "needs_info",
        "scheduled",
        "in_progress",
        "paused",
        "escalated",
        "completed",
        "qa_review",
        "closed",
        "reopened",
        "canceled",
        "rejected",
      ],
      message_channel_t: ["whatsapp", "sms", "email", "push", "in_app"],
      message_status_t: [
        "queued",
        "sending",
        "sent",
        "delivered",
        "read",
        "failed",
        "rejected",
        "expired",
      ],
      mr_status: [
        "Open",
        "Assigned",
        "InProgress",
        "Waiting",
        "Completed",
        "Rejected",
        "Cancelled",
        "In Progress",
        "Closed",
        "On Hold",
      ],
      priority_level: ["low", "medium", "high"],
      provider_type_t: ["internal_team", "external_vendor"],
      request_status_canonical: [
        "open",
        "active",
        "blocked",
        "done",
        "terminal",
      ],
      request_status_t: [
        "draft",
        "awaiting_vendor",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      technician_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "active",
        "suspended",
      ],
      update_type: [
        "status_change",
        "assignment",
        "scheduling",
        "cost_estimate",
        "completion",
        "feedback",
        "payment",
        "note",
      ],
      wa_template_category: ["utility", "marketing", "authentication"],
      wa_template_quality: ["unknown", "high", "medium", "low"],
      wa_template_status: [
        "draft",
        "submitted",
        "pending",
        "approved",
        "rejected",
        "paused",
        "disabled",
        "deleted",
      ],
      wo_status: [
        "Pending",
        "Scheduled",
        "EnRoute",
        "InProgress",
        "Paused",
        "Completed",
        "Cancelled",
      ],
      workflow_stage_t: [
        "draft",
        "submitted",
        "triaged",
        "assigned",
        "scheduled",
        "in_progress",
        "inspection",
        "waiting_parts",
        "on_hold",
        "completed",
        "billed",
        "paid",
        "handover_to_admin",
        "closed",
        "cancelled",
        "rejected",
      ],
    },
  },
} as const
