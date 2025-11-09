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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_learning_feedback: {
        Row: {
          action_id: string
          corrected_action: Json | null
          created_at: string
          feedback_notes: string | null
          feedback_type: string
          id: string
          original_action: Json
          user_id: string
        }
        Insert: {
          action_id: string
          corrected_action?: Json | null
          created_at?: string
          feedback_notes?: string | null
          feedback_type: string
          id?: string
          original_action: Json
          user_id: string
        }
        Update: {
          action_id?: string
          corrected_action?: Json | null
          created_at?: string
          feedback_notes?: string | null
          feedback_type?: string
          id?: string
          original_action?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_feedback_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "ai_ticket_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_ticket_actions: {
        Row: {
          action_data: Json
          action_type: string
          agent_type: string
          confidence_score: number
          created_at: string
          executed_at: string | null
          id: string
          reasoning: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          agent_type: string
          confidence_score: number
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          agent_type?: string
          confidence_score?: number
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_ticket_actions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string
          resource_id: string | null
          resource_type: string
          severity: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id: string
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      compliance_certifications: {
        Row: {
          certificate_url: string | null
          certification_type: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          certificate_url?: string | null
          certification_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          certificate_url?: string | null
          certification_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string | null
          customer_email: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string
          revoked_at: string | null
          source: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string | null
          customer_email?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id: string
          revoked_at?: string | null
          source?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string | null
          customer_email?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string
          revoked_at?: string | null
          source?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          created_at: string | null
          description: string | null
          export_file_path: string | null
          id: string
          notes: string | null
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          request_type: Database["public"]["Enums"]["dsr_type"]
          requested_at: string
          requester_email: string
          requester_name: string | null
          status: Database["public"]["Enums"]["dsr_status"]
          updated_at: string | null
          verification_expires_at: string | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          export_file_path?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          request_type: Database["public"]["Enums"]["dsr_type"]
          requested_at?: string
          requester_email: string
          requester_name?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          export_file_path?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: Database["public"]["Enums"]["dsr_type"]
          requested_at?: string
          requester_email?: string
          requester_name?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      external_ticket_links: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          external_system: string
          external_ticket_id: string
          external_ticket_url: string | null
          id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          external_system: string
          external_ticket_id: string
          external_ticket_url?: string | null
          id?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          external_system?: string
          external_ticket_id?: string
          external_ticket_url?: string | null
          id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_ticket_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_ticket_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_presets: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          new_messages: boolean | null
          system_alerts: boolean | null
          ticket_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          new_messages?: boolean | null
          system_alerts?: boolean | null
          ticket_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          new_messages?: boolean | null
          system_alerts?: boolean | null
          ticket_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organization_ai_credentials: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          id: string
          organization_id: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          id?: string
          organization_id: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          ai_agents_enabled: boolean | null
          ai_auto_anonymize: boolean | null
          ai_auto_execution_actions: Json | null
          ai_auto_execution_enabled: boolean | null
          ai_auto_execution_threshold: number | null
          ai_auto_suggest_responses: boolean | null
          ai_block_sensitive_categories: string[] | null
          ai_custom_endpoint: string | null
          ai_custom_model: string | null
          ai_enabled: boolean | null
          ai_knowledge_base_enabled: boolean | null
          ai_pii_detection_enabled: boolean | null
          ai_priority_suggestions: boolean | null
          ai_provider: string | null
          ai_require_consent_for_pii: boolean | null
          ai_sentiment_analysis: boolean | null
          ai_summarization_enabled: boolean | null
          ai_template_suggestions_enabled: boolean | null
          ai_translation_enabled: boolean | null
          ai_transparency_notice_url: string | null
          created_at: string | null
          data_retention_days: number | null
          gdpr_dpo_email: string | null
          id: string
          ip_whitelist: string[] | null
          language: string | null
          logo_url: string | null
          organization_id: string
          platform_name: string | null
          session_timeout_minutes: number | null
          timezone: string | null
          two_factor_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          ai_agents_enabled?: boolean | null
          ai_auto_anonymize?: boolean | null
          ai_auto_execution_actions?: Json | null
          ai_auto_execution_enabled?: boolean | null
          ai_auto_execution_threshold?: number | null
          ai_auto_suggest_responses?: boolean | null
          ai_block_sensitive_categories?: string[] | null
          ai_custom_endpoint?: string | null
          ai_custom_model?: string | null
          ai_enabled?: boolean | null
          ai_knowledge_base_enabled?: boolean | null
          ai_pii_detection_enabled?: boolean | null
          ai_priority_suggestions?: boolean | null
          ai_provider?: string | null
          ai_require_consent_for_pii?: boolean | null
          ai_sentiment_analysis?: boolean | null
          ai_summarization_enabled?: boolean | null
          ai_template_suggestions_enabled?: boolean | null
          ai_translation_enabled?: boolean | null
          ai_transparency_notice_url?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          gdpr_dpo_email?: string | null
          id?: string
          ip_whitelist?: string[] | null
          language?: string | null
          logo_url?: string | null
          organization_id: string
          platform_name?: string | null
          session_timeout_minutes?: number | null
          timezone?: string | null
          two_factor_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ai_agents_enabled?: boolean | null
          ai_auto_anonymize?: boolean | null
          ai_auto_execution_actions?: Json | null
          ai_auto_execution_enabled?: boolean | null
          ai_auto_execution_threshold?: number | null
          ai_auto_suggest_responses?: boolean | null
          ai_block_sensitive_categories?: string[] | null
          ai_custom_endpoint?: string | null
          ai_custom_model?: string | null
          ai_enabled?: boolean | null
          ai_knowledge_base_enabled?: boolean | null
          ai_pii_detection_enabled?: boolean | null
          ai_priority_suggestions?: boolean | null
          ai_provider?: string | null
          ai_require_consent_for_pii?: boolean | null
          ai_sentiment_analysis?: boolean | null
          ai_summarization_enabled?: boolean | null
          ai_template_suggestions_enabled?: boolean | null
          ai_translation_enabled?: boolean | null
          ai_transparency_notice_url?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          gdpr_dpo_email?: string | null
          id?: string
          ip_whitelist?: string[] | null
          language?: string | null
          logo_url?: string | null
          organization_id?: string
          platform_name?: string | null
          session_timeout_minutes?: number | null
          timezone?: string | null
          two_factor_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          auto_delete: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          organization_id: string
          resource_type: string
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          auto_delete?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          organization_id: string
          resource_type: string
          retention_days: number
          updated_at?: string | null
        }
        Update: {
          auto_delete?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          organization_id?: string
          resource_type?: string
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          permission_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          permission_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          permission_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_usage: {
        Row: {
          effectiveness_score: number | null
          id: string
          template_id: string
          ticket_id: string
          used_at: string | null
          used_by: string | null
          was_modified: boolean | null
        }
        Insert: {
          effectiveness_score?: number | null
          id?: string
          template_id: string
          ticket_id: string
          used_at?: string | null
          used_by?: string | null
          was_modified?: boolean | null
        }
        Update: {
          effectiveness_score?: number | null
          id?: string
          template_id?: string
          ticket_id?: string
          used_at?: string | null
          used_by?: string | null
          was_modified?: boolean | null
        }
        Relationships: []
      }
      ticket_activities: {
        Row: {
          activity_type: string
          ai_processing_consent_given: boolean | null
          ai_processing_detected_pii: boolean | null
          content: string | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          data_anonymized: boolean | null
          gdpr_compliance_check: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          activity_type: string
          ai_processing_consent_given?: boolean | null
          ai_processing_detected_pii?: boolean | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          data_anonymized?: boolean | null
          gdpr_compliance_check?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          activity_type?: string
          ai_processing_consent_given?: boolean | null
          ai_processing_detected_pii?: boolean | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          data_anonymized?: boolean | null
          gdpr_compliance_check?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_data_classification: {
        Row: {
          ai_usage_consent: boolean | null
          consent_given_at: string | null
          consent_given_by: string | null
          contains_pii: boolean
          created_at: string | null
          gdpr_relevant: boolean | null
          id: string
          last_analyzed_at: string | null
          pii_types: string[] | null
          sensitivity_level: string | null
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          ai_usage_consent?: boolean | null
          consent_given_at?: string | null
          consent_given_by?: string | null
          contains_pii?: boolean
          created_at?: string | null
          gdpr_relevant?: boolean | null
          id?: string
          last_analyzed_at?: string | null
          pii_types?: string[] | null
          sensitivity_level?: string | null
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          ai_usage_consent?: boolean | null
          consent_given_at?: string | null
          consent_given_by?: string | null
          contains_pii?: boolean
          created_at?: string | null
          gdpr_relevant?: boolean | null
          id?: string
          last_analyzed_at?: string | null
          pii_types?: string[] | null
          sensitivity_level?: string | null
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_data_classification_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_discussions: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_resolved: boolean | null
          parent_id: string | null
          participants: string[]
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          participants?: string[]
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          participants?: string[]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_discussions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ticket_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_discussions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mentions: {
        Row: {
          activity_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string | null
          ticket_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id?: string | null
          ticket_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          message_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mentions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ticket_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mentions_mentioned_by_user_id_fkey"
            columns: ["mentioned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mentions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_merge_history: {
        Row: {
          id: string
          merge_data: Json | null
          merged_at: string | null
          merged_by: string
          source_ticket_id: string
          target_ticket_id: string
        }
        Insert: {
          id?: string
          merge_data?: Json | null
          merged_at?: string | null
          merged_by: string
          source_ticket_id: string
          target_ticket_id: string
        }
        Update: {
          id?: string
          merge_data?: Json | null
          merged_at?: string | null
          merged_by?: string
          source_ticket_id?: string
          target_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_merge_history_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_merge_history_target_ticket_id_fkey"
            columns: ["target_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          sender_email: string
          sender_id: string | null
          sender_name: string | null
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_email: string
          sender_id?: string | null
          sender_name?: string | null
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_email?: string
          sender_id?: string | null
          sender_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_relationships: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          related_ticket_id: string
          relationship_type: Database["public"]["Enums"]["ticket_relationship_type"]
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          related_ticket_id: string
          relationship_type: Database["public"]["Enums"]["ticket_relationship_type"]
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          related_ticket_id?: string
          relationship_type?: Database["public"]["Enums"]["ticket_relationship_type"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_relationships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_relationships_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_relationships_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_watchers: {
        Row: {
          created_at: string | null
          id: string
          notification_enabled: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          ai_last_action_at: string | null
          ai_status: string | null
          assigned_to: string | null
          auto_resolution_attempted: boolean | null
          created_at: string | null
          created_by: string | null
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          merge_reason: string | null
          merged_into: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sentiment: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string | null
          title: string
          updated_at: string | null
          urgency_score: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_last_action_at?: string | null
          ai_status?: string | null
          assigned_to?: string | null
          auto_resolution_attempted?: boolean | null
          created_at?: string | null
          created_by?: string | null
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          merge_reason?: string | null
          merged_into?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string | null
          title: string
          updated_at?: string | null
          urgency_score?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_last_action_at?: string | null
          ai_status?: string | null
          assigned_to?: string | null
          auto_resolution_attempted?: boolean | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          merge_reason?: string | null
          merged_into?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sentiment?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string | null
          title?: string
          updated_at?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_retention_policies: {
        Args: { manual_execution?: boolean }
        Returns: undefined
      }
      generate_ticket_number: { Args: { org_id: string }; Returns: string }
      get_user_organization_id: { Args: { user_id: string }; Returns: string }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_allowed: {
        Args: { _ip_address: string; _organization_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _organization_id: string
          _resource_id?: string
          _resource_type: string
          _severity?: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      consent_type:
        | "data_processing"
        | "marketing"
        | "analytics"
        | "ai_processing"
        | "third_party_sharing"
      dsr_status: "pending" | "processing" | "completed" | "rejected"
      dsr_type: "export" | "deletion" | "rectification" | "restriction"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_relationship_type:
        | "related"
        | "parent"
        | "child"
        | "blocks"
        | "blocked_by"
        | "duplicate"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "admin" | "agent" | "viewer"
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
      consent_type: [
        "data_processing",
        "marketing",
        "analytics",
        "ai_processing",
        "third_party_sharing",
      ],
      dsr_status: ["pending", "processing", "completed", "rejected"],
      dsr_type: ["export", "deletion", "rectification", "restriction"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_relationship_type: [
        "related",
        "parent",
        "child",
        "blocks",
        "blocked_by",
        "duplicate",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["admin", "agent", "viewer"],
    },
  },
} as const
