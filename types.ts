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
  icon?: any;
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

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: string;
}