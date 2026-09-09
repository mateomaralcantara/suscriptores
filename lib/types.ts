export type Status =
  | "draft"
  | "validating"
  | "queued"
  | "submitted"
  | "processing"
  | "completed"
  | "partial"
  | "canceled"
  | "failed"
  | "refunding"
  | "refunded"
  | "open"
  | "pending"
  | "active"
  | "inactive";

export type Service = {
  id: string;
  providerId: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  userPrice: number;
  min: number;
  max: number;
  eta: string;
  quality: "Standard" | "Premium" | "Enterprise";
  refill: boolean;
  cancel: boolean;
  status: "active" | "inactive";
};

export type Order = {
  id: string;
  service: string;
  target: string;
  quantity: number;
  cost: number;
  status: Status;
  provider: string;
  createdAt: string;
};
