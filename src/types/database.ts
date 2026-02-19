export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ExpenseCategory = 'rent' | 'pub' | 'cleaning' | 'provisions' | 'other'
export type MemberRole = 'owner' | 'renter'
export type ContributionStatus = 'pending' | 'partially_collected' | 'collected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; avatar_url: string | null; phone: string | null; created_at: string; updated_at: string }
        Insert: { id: string; name?: string | null; avatar_url?: string | null; phone?: string | null }
        Update: { name?: string | null; avatar_url?: string | null; phone?: string | null; updated_at?: string }
      }
      units: {
        Row: { id: string; name: string; address: string | null; country: string | null; zipcode: string | null; monthly_rent: number; created_by: string | null; created_at: string; updated_at: string }
        Insert: { name: string; address?: string | null; country?: string | null; zipcode?: string | null; monthly_rent?: number; created_by?: string | null }
        Update: { name?: string; address?: string | null; country?: string | null; zipcode?: string | null; monthly_rent?: number; updated_at?: string }
      }
      unit_members: {
        Row: { id: string; unit_id: string; user_id: string; role: MemberRole; share_percentage: number; joined_at: string }
        Insert: { unit_id: string; user_id: string; role: MemberRole; share_percentage?: number }
        Update: { role?: MemberRole; share_percentage?: number }
      }
      expenses: {
        Row: { id: string; unit_id: string; category: ExpenseCategory; amount: number; paid_by: string; date: string; notes: string | null; created_at: string }
        Insert: { unit_id: string; category: ExpenseCategory; amount: number; paid_by: string; date: string; notes?: string | null }
        Update: { category?: ExpenseCategory; amount?: number; paid_by?: string; date?: string; notes?: string | null }
      }
      contributions: {
        Row: { id: string; unit_id: string; amount: number; reason: string; requested_by: string; status: ContributionStatus; created_at: string }
        Insert: { unit_id: string; amount: number; reason: string; requested_by: string; status?: ContributionStatus }
        Update: { status?: ContributionStatus }
      }
      contribution_payments: {
        Row: { id: string; contribution_id: string; user_id: string; amount: number; paid_at: string }
        Insert: { contribution_id: string; user_id: string; amount: number }
        Update: never
      }
    }
  }
}
