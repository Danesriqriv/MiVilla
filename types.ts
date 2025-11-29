export type Role = 'X' | 'A' | 'B';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  avatar: string;
  unit?: string; // Optional: specific for Role B (Residents)
}

export interface Resident {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  type: 'Resident' | 'Family' | 'Visitor' | 'Delivery'; // Updated types
  status: 'Active' | 'Inactive';
  licensePlate?: string; // New optional field
  expirationDate?: string; // New optional field for auto-deletion
}

export interface Visit {
  id: string;
  tenantId: string;
  visitorName: string;
  residentId: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Completed';
  code: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}