export interface Variation {
  id: string;
  name: string;
  price: number;
  description?: string;
  sort_order?: number;
  category?: string;
  sort?: number;
}

export interface CustomField {
  label: string;
  key: string;
  required: boolean;
  placeholder?: string;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number; // Kept for database compatibility, but not used in UI
  category: string;
  image?: string;
  popular?: boolean;
  available?: boolean;
  sort_order?: number; // Sort order within category
  variations?: Variation[];
  // Discount pricing fields - percentage based
  discountPercentage?: number; // Percentage discount (0-100)
  discountStartDate?: string;
  discountEndDate?: string;
  discountActive?: boolean;
  // Legacy field for backward compatibility (will be removed)
  discountPrice?: number;
  // Computed effective price (calculated in the app)
  effectivePrice?: number;
  isOnDiscount?: boolean;
  // Custom fields for customer information
  customFields?: CustomField[];
  // Custom text to display below game title
  subtitle?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariation?: Variation;
  selectedAddOns?: AddOn[];
  totalPrice: number;
}

export interface OrderData {
  items: CartItem[];
  customerName: string;
  contactNumber: string;
  serviceType: 'dine-in' | 'pickup' | 'delivery';
  address?: string;
  pickupTime?: string;
  // Dine-in specific fields
  partySize?: number;
  dineInTime?: string;
  paymentMethod: 'gcash' | 'maya' | 'bank-transfer';
  referenceNumber?: string;
  total: number;
  notes?: string;
}

export type PaymentMethod = 'gcash' | 'maya' | 'bank-transfer' | 'cash';
export type ServiceType = 'dine-in' | 'pickup' | 'delivery';

// Site Settings Types
export interface SiteSetting {
  id: string;
  value: string;
  type: 'text' | 'image' | 'boolean' | 'number';
  description?: string;
  updated_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string;
  site_description: string;
  currency: string;
  currency_code: string;
  // Footer links
  footer_social_1?: string;
  footer_social_2?: string;
  footer_social_3?: string;
  footer_social_4?: string;
  footer_support_url?: string;
  // Order option
  order_option?: 'order_via_messenger' | 'place_order';
}

// Order Types
export type OrderStatus = 'pending' | 'processing' | 'approved' | 'rejected';

export interface Order {
  id: string;
  order_items: CartItem[];
  customer_info: Record<string, string>; // e.g., { "IGN": "Miki", "Payment Method": "GCash" }
  payment_method_id: string;
  receipt_url: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderData {
  order_items: CartItem[];
  customer_info: Record<string, string>;
  payment_method_id: string;
  receipt_url: string;
  total_price: number;
}