export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      extractions: {
        Row: {
          id: string;
          url: string;
          title: string | null;
          status: string;
          image_count: number;
          colors: Json | null;
          typography: Json | null;
          content_summary: Json | null;
          images: Json | null;
          content: Json | null;
          error: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          url: string;
          title?: string | null;
          status?: string;
          image_count?: number;
          colors?: Json | null;
          typography?: Json | null;
          content_summary?: Json | null;
          images?: Json | null;
          content?: Json | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string | null;
          status?: string;
          image_count?: number;
          colors?: Json | null;
          typography?: Json | null;
          content_summary?: Json | null;
          images?: Json | null;
          content?: Json | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
