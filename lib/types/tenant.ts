// lib/types/tenant.ts
export interface Tenant {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: string; // 'active', 'inactive', 'suspended'
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes?: string;

  // Relations included in API responses
  locations?: NodeTenantLocation[];
  locationCount?: number;
  activeLocations?: number;
  inactiveLocations?: number;
}

export interface NodeTenantLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url?: string;
  topic?: string;
  description?: string;
  status: boolean;
  nodeType: string; // 'server' or 'node'
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;

  // Relations included in API responses
  tenant?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
  };
}

export interface TenantFormData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  notes?: string;
}

export interface NodeTenantLocationFormData {
  name: string;
  longitude: number;
  latitude: number;
  url?: string;
  topic?: string;
  description?: string;
  status: boolean;
  nodeType: string;
  tenantId?: string;
}
