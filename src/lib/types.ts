// Domain types mirroring the Supabase schema (see supabase/schema.sql).

export type AgentStatus = "available" | "away";

export interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
  status: AgentStatus;
  created_at: string;
}

export type InquiryState = "queued" | "assigned" | "resolved";

export interface Inquiry {
  id: string;
  session_id: string;
  customer_name: string;
  channel: string;
  state: InquiryState;
  current_agent_id: string | null;
  current_assigned_at: string | null;
  last_customer_msg_at: string | null;
  last_agent_msg_at: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type AssignmentReason = "initial" | "reassigned_timeout" | "manual";

export interface Assignment {
  id: string;
  inquiry_id: string;
  agent_id: string;
  assigned_at: string;
  released_at: string | null;
  reason: AssignmentReason;
}

export type SenderType = "customer" | "agent";

export interface Message {
  id: string;
  inquiry_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  body: string;
  created_at: string;
}

export type ListingType = "condo" | "house" | "lot" | "townhouse";
export type ListingStatus = "available" | "reserved" | "sold";

export interface Listing {
  id: string;
  title: string;
  type: ListingType;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area_sqm: number | null;
  status: ListingStatus;
  image_urls: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const LISTING_TYPES: ListingType[] = ["condo", "house", "lot", "townhouse"];
export const LISTING_STATUSES: ListingStatus[] = ["available", "reserved", "sold"];
