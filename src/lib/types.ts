export type MaterialType =
  | "Notes"
  | "PDF Notes"
  | "Important Questions"
  | "Previous Question Paper"
  | "Study Material"
  | "Lab Material"
  | "Reference Material"
  | "Formula Sheet"
  | "Revision Notes"
  | "Diagrams"
  | "Previous Papers"
  | "Video"
  | "Other";

export const MATERIAL_TYPES: MaterialType[] = [
  "Notes",
  "PDF Notes",
  "Important Questions",
  "Previous Question Paper",
  "Study Material",
  "Lab Material",
  "Reference Material",
  "Formula Sheet",
  "Revision Notes",
  "Diagrams",
  "Previous Papers",
  "Video",
  "Other",
];

export type Subject = {
  id: string;
  name: string;
  code?: string | undefined;
  year: number;
  semester: number;
  description?: string | undefined;
  status?: "active" | "inactive" | undefined;
};

export type Material = {
  id: string;
  title: string;
  description: string;
  year: number;
  semester: number;
  subjectId: string;
  type: MaterialType;
  price: number;
  isPremium: boolean;
  thumbnail?: string | undefined;
  driveUrl?: string | undefined;
  fileUrl?: string | undefined;
  driveFileId?: string | undefined;
  driveFolderId?: string | undefined;
  fileName?: string | undefined;
  fileType?: string | undefined;
  fileSize?: string | undefined;
  fileDataUrl?: string | undefined;
  sourceType?: "upload" | "drive" | "protected_url" | undefined;
  author?: string | undefined;
  pages?: number | undefined;
  comboEligible?: boolean | undefined;
  topics: string[];
  published: boolean;
  status?: "Published" | "Draft" | "Inactive" | undefined;
  order: number;
  demo?: boolean | undefined;
  sampleContent?: string[] | undefined;
  createdAt: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  college: string;
  year: number;
  semester: number;
  passwordHash?: string | undefined;
  disabled?: boolean | undefined;
  lastLogin?: string | undefined;
  createdAt: string;
};

export type Admin = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  phone: string;
  passwordHash: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  mobile?: string | null;
  college?: string | null;
  year?: number | null;
  semester?: number | null;
  role: "admin" | "student";
  avatar_url?: string | null;
  disabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Purchase = {
  id: string;
  studentId: string;
  materialId: string;
  amount: number;
  status: "pending" | "unlocked";
  createdAt: string;
};

export type OrderStatus = "Paid" | "Pending" | "Failed" | "Cancelled" | "Refunded";

export type Order = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  productId: string;
  productType: "material" | "subject" | "semester" | "year";
  productTitle: string;
  materialIds: string[];
  amount: number;
  discount: number;
  finalAmount: number;
  gateway: "razorpay" | "stripe" | "test";
  status: OrderStatus;
  transactionId: string;
  orderDate: string;
  paymentDate?: string;
  termsAccepted: boolean;
  termsAcceptedAt: string;
  termsVersion: string;
};

export type Package = {
  id: string;
  name: string;
  type: "subject" | "semester" | "year";
  year: number;
  semester?: number;
  subjectIds: string[];
  materialIds: string[];
  originalPrice: number;
  offerPrice: number;
  savingsPercent: number;
  description: string;
  badge?: string;
};

export type DriveSettings = {
  connected: boolean;
  rootFolderId: string;
  rootFolderName: string;
  clientIdConfigured: boolean;
  note: string;
};

export type PaymentGatewaySettings = {
  gateway: "razorpay" | "stripe";
  keyId: string;
  secretKeyConfigured: boolean;
  webhookConfigured: boolean;
  currency: string;
  mode: "test" | "live";
  status: "active" | "inactive";
};

export type WebsiteSettings = {
  siteName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currencySymbol: string;
  announcement: string;
  allowRegistrations: boolean;
};

export type DocumentAccessLog = {
  id: string;
  studentId: string;
  studentEmail: string;
  materialId: string;
  materialTitle: string;
  accessedAt: string;
};

export type DB = {
  version: number;
  subjects: Subject[];
  materials: Material[];
  students: Student[];
  admin: Admin;
  purchases: Purchase[];
  orders: Order[];
  packages: Package[];
  favorites: { studentId: string; materialId: string }[];
  recent: { studentId: string; materialId: string; at: string }[];
  drive: DriveSettings;
  paymentGateway: PaymentGatewaySettings;
  websiteSettings: WebsiteSettings;
  accessLogs: DocumentAccessLog[];
};

export type Session =
  | { role: "student"; id: string }
  | { role: "admin"; id: string }
  | null;
