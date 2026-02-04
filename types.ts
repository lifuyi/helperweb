export interface VpnPlan {
  days: number;
  price: number;
  label: string;
  popular?: boolean;
}

export interface PdfProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  features: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

export enum SectionId {
  HOME = 'home',
  GUIDES = 'guides',
  VPN = 'vpn',
  FAQ = 'faq',
}

export interface PaymentProduct {
  id: string;
  name: string;
  price: number;
  type: 'one-time' | 'subscription';
  description?: string;
}

export interface PaymentEvent {
  type: 'checkout_success' | 'checkout_error' | 'payment_canceled';
  productId?: string;
  error?: string;
}

// AuthUser is defined in supabaseService.ts - exported from there
// This re-export ensures consistency across the application
export type { AuthUser } from './services/supabaseService';