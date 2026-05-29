export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          id: string
          ip_address: unknown
          payload: Json
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          payload?: Json
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          payload?: Json
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          icon_emoji: string | null
          id: string
          is_active: boolean
          label: string
          only_admin_can_post: boolean
          required_plan: string
          sort_order: number
          trial_preview_count: number | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_emoji?: string | null
          id: string
          is_active?: boolean
          label: string
          only_admin_can_post?: boolean
          required_plan: string
          sort_order?: number
          trial_preview_count?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          label?: string
          only_admin_can_post?: boolean
          required_plan?: string
          sort_order?: number
          trial_preview_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_required_plan_fkey"
            columns: ["required_plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_attachments: {
        Row: {
          attachment_type: string
          caption: string | null
          content_id: string
          created_at: string
          display_order: number
          external_provider: string | null
          external_url: string | null
          id: string
          storage_path: string | null
          thumbnail_url: string | null
          video_id: string | null
        }
        Insert: {
          attachment_type: string
          caption?: string | null
          content_id: string
          created_at?: string
          display_order?: number
          external_provider?: string | null
          external_url?: string | null
          id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          video_id?: string | null
        }
        Update: {
          attachment_type?: string
          caption?: string | null
          content_id?: string
          created_at?: string
          display_order?: number
          external_provider?: string | null
          external_url?: string | null
          id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_attachments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          deleted_at: string | null
          id: string
          last_edited_at: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          content_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          last_edited_at: string | null
          last_editor_id: string | null
          pinned: boolean
          published_at: string | null
          required_plan: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          last_editor_id?: string | null
          pinned?: boolean
          published_at?: string | null
          required_plan?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          last_editor_id?: string | null
          pinned?: boolean
          published_at?: string | null
          required_plan?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_last_editor_id_fkey"
            columns: ["last_editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_required_plan_fkey"
            columns: ["required_plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cpa_reports: {
        Row: {
          author_id: string
          campaign_name: string
          conversions: number
          cost: number
          cpa: number | null
          created_at: string
          id: string
          image_path: string | null
          month: string
          note: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          campaign_name: string
          conversions: number
          cost: number
          cpa?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          month: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          campaign_name?: string
          conversions?: number
          cost?: number
          cpa?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          month?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpa_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          plan: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          plan: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          plan?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_reports: {
        Row: {
          after_value: number
          author_id: string
          before_value: number
          change_rate: number | null
          created_at: string
          id: string
          image_path: string | null
          kpi_name: string
          month: string
          note: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          after_value: number
          author_id: string
          before_value: number
          change_rate?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          kpi_name: string
          month: string
          note?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          after_value?: number
          author_id?: string
          before_value?: number
          change_rate?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          kpi_name?: string
          month?: string
          note?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          admin_broadcast: boolean
          comment_on_my_post: boolean
          like_on_my_post: boolean
          new_announcement: boolean
          new_post: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_broadcast?: boolean
          comment_on_my_post?: boolean
          like_on_my_post?: boolean
          new_announcement?: boolean
          new_post?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_broadcast?: boolean
          comment_on_my_post?: boolean
          like_on_my_post?: boolean
          new_announcement?: boolean
          new_post?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          link_path: string
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          link_path?: string
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          link_path?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string
          display_price: string
          features: Json
          id: string
          is_active: boolean
          label: string
          price_amount: number
          rank: number
          sort_order: number
          tax_included: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_price: string
          features?: Json
          id: string
          is_active?: boolean
          label: string
          price_amount: number
          rank: number
          sort_order?: number
          tax_included?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_price?: string
          features?: Json
          id?: string
          is_active?: boolean
          label?: string
          price_amount?: number
          rank?: number
          sort_order?: number
          tax_included?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          attachment_type: string
          caption: string | null
          created_at: string
          display_order: number
          external_provider: string | null
          external_url: string | null
          id: string
          post_id: string
          storage_path: string | null
          thumbnail_url: string | null
          video_id: string | null
        }
        Insert: {
          attachment_type: string
          caption?: string | null
          created_at?: string
          display_order?: number
          external_provider?: string | null
          external_url?: string | null
          id?: string
          post_id: string
          storage_path?: string | null
          thumbnail_url?: string | null
          video_id?: string | null
        }
        Update: {
          attachment_type?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          external_provider?: string | null
          external_url?: string | null
          id?: string
          post_id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          last_edited_at: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_edited_at?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tag_assignments: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tag_assignments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "post_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_by_admin: boolean
          id: string
          last_edited_at: string | null
          last_editor_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_by_admin?: boolean
          id?: string
          last_edited_at?: string | null
          last_editor_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_by_admin?: boolean
          id?: string
          last_edited_at?: string | null
          last_editor_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_last_editor_id_fkey"
            columns: ["last_editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_genres: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon_emoji: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_emoji: string
          id: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_emoji?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_genres_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_product_genres: {
        Row: {
          created_at: string
          genre_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          genre_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          genre_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_product_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "product_genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_product_genres_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          avatar_image_path: string | null
          bio: string | null
          business_type: string | null
          company_address: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          display_name: string
          id: string
          last_active_at: string
          plan: string | null
          product: string
          region: string
          role: string
          social_links: Json | null
          status: string
          store_description: string | null
          store_image_path: string | null
          store_name: string
          suspended_until: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar?: string
          avatar_image_path?: string | null
          bio?: string | null
          business_type?: string | null
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          display_name: string
          id: string
          last_active_at?: string
          plan?: string | null
          product?: string
          region?: string
          role?: string
          social_links?: Json | null
          status?: string
          store_description?: string | null
          store_image_path?: string | null
          store_name?: string
          suspended_until?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar?: string
          avatar_image_path?: string | null
          bio?: string | null
          business_type?: string | null
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          display_name?: string
          id?: string
          last_active_at?: string
          plan?: string | null
          product?: string
          region?: string
          role?: string
          social_links?: Json | null
          status?: string
          store_description?: string | null
          store_image_path?: string | null
          store_name?: string
          suspended_until?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reports: {
        Row: {
          achievement_rate: number | null
          author_id: string
          created_at: string
          id: string
          image_path: string | null
          initiatives_count: number
          month: string
          note: string | null
          sales: number
          sales_target: number
          updated_at: string
        }
        Insert: {
          achievement_rate?: number | null
          author_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          initiatives_count?: number
          month: string
          note?: string | null
          sales: number
          sales_target: number
          updated_at?: string
        }
        Update: {
          achievement_rate?: number | null
          author_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          initiatives_count?: number
          month?: string
          note?: string | null
          sales?: number
          sales_target?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      channel_only_admin_can_post: {
        Args: { channel_id: string }
        Returns: boolean
      }
      channel_required_rank: { Args: { channel_id: string }; Returns: number }
      current_plan_rank: { Args: never; Returns: number }
      current_status: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      is_active_member: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_profile_active: { Args: { profile_id: string }; Returns: boolean }
      is_standard_or_higher: { Args: never; Returns: boolean }
      plan_rank: { Args: { plan_id: string }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      touch_last_active: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

