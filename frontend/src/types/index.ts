export interface Category {
  id:    number;
  name:  string;
  slug:  string;
  icon?: string;
  color?: string;
}

export interface AisleMap {
  id:          number;
  aisle_code:  string;
  aisle_name:  string;
  x:           number;
  y:           number;
  width:       number;
  height:      number;
  description?: string;
}

export interface Product {
  id:                        number;
  sku:                       string;
  barcode?:                  string;
  name:                      string;
  description?:              string;
  price:                     number;
  weight_grams?:             number;
  weight_tolerance_percent?: number;
  image_url?:                string;
  yolo_class_name?:          string;
  stock_quantity?:           number;
  category?:                 Category;
  aisle?:                    AisleMap;
  shelf_position?:           string;
}

export type ItemStatus = "pending" | "verified" | "flagged" | "removed";

export interface CartItem {
  id:                 number;
  session_id:         number;
  product:            Product;
  quantity:           number;
  unit_price:         number;
  vision_verified:    boolean;
  weight_verified:    boolean;
  status:             ItemStatus;
  added_at:           string;
  verified_at?:       string;
  removed_at?:        string;
  vision_confidence?: number;
  detected_class?:    string;
  weight_delta_grams?: number;
}

export type SessionStatus = "active" | "checkout" | "completed" | "abandoned";

export interface TrolleySession {
  id:              number;
  session_token:   string;
  trolley_id?:     string;
  customer_phone?: string;
  status:          SessionStatus;
  total_amount:    number;
  item_count:      number;
  started_at:      string;
  completed_at?:   string;
  items:           CartItem[];
}

export type PaymentStatus = "pending" | "processing" | "completed" | "failed";

export interface Transaction {
  id:              number;
  transaction_ref: string;
  customer_phone?: string;
  amount:          number;
  payment_method:  string;
  status:          PaymentStatus;
  ecocash_ref?:    string;
  initiated_at:    string;
  completed_at?:   string;
  receipt_data?:   ReceiptData;
}

export interface ReceiptData {
  receipt_number:  string;
  transaction_ref: string;
  ecocash_ref?:    string;
  customer_phone?: string;
  amount:          number;
  items:           ReceiptItem[];
  paid_at:         string;
  trolley_id?:     string;
}

export interface ReceiptItem {
  name:       string;
  quantity:   number;
  unit_price: number;
  line_total: number;
}

export interface RecipeShoppingItem {
  ingredient: string;
  quantity?:  number;
  unit?:      string;
  notes?:     string;
  product?:   {
    id:        number;
    name:      string;
    price:     number;
    sku:       string;
    barcode?:  string;
    image_url?: string;
  };
  aisle?: {
    code: string;
    name: string;
    x:    number;
    y:    number;
  };
  shelf?: string;
}

export interface Recipe {
  id:            number;
  name:          string;
  slug:          string;
  description?:  string;
  servings?:     number;
  prep_time?:    number;
  cook_time?:    number;
  tags?:         string[];
  shopping_list: RecipeShoppingItem[];
}

export interface WsMessage {
  type: string;
  data: Record<string, unknown>;
}

export interface MismatchLog {
  id:             number;
  session_id?:    number;
  scanned_sku?:   string;
  detected_class?: string;
  confidence?:    number;
  weight_delta?:  number;
  mismatch_type?: string;
  resolved:       boolean;
  created_at:     string;
}

export interface AdminStats {
  total_sessions:        number;
  active_sessions:       number;
  completed_today:       number;
  revenue_today:         number;
  unresolved_mismatches: number;
}
