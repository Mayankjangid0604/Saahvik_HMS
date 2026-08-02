/** Vendors + purchase records API (feature 9). */
import type {
  CreatePurchaseInput,
  CreateVendorInput,
  Paginated,
  PurchaseListParams,
  PurchaseRecord,
  PurchaseSummary,
  UpdateVendorInput,
  Vendor,
  VendorListParams,
} from "./types";
import { apiClient } from "./client";

// ---------- Vendors ----------

export async function listVendors(params: VendorListParams = {}): Promise<Paginated<Vendor>> {
  const { data } = await apiClient.get<Paginated<Vendor>>("/vendors", { params });
  return data;
}

export async function getVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.get<Vendor>(`/vendors/${id}`);
  return data;
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const { data } = await apiClient.post<Vendor>("/vendors", input);
  return data;
}

export async function updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
  const { data } = await apiClient.put<Vendor>(`/vendors/${id}`, input);
  return data;
}

/** Soft-deactivate a vendor (history is preserved). */
export async function deactivateVendor(id: string): Promise<Vendor> {
  const { data } = await apiClient.delete<Vendor>(`/vendors/${id}`);
  return data;
}

// ---------- Purchases ----------

export async function listPurchases(
  params: PurchaseListParams = {},
): Promise<Paginated<PurchaseRecord>> {
  const { data } = await apiClient.get<Paginated<PurchaseRecord>>("/purchases", { params });
  return data;
}

export async function purchaseSummary(
  params: PurchaseListParams = {},
): Promise<PurchaseSummary> {
  const { data } = await apiClient.get<PurchaseSummary>("/purchases/summary", { params });
  return data;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseRecord> {
  const { data } = await apiClient.post<PurchaseRecord>("/purchases", input);
  return data;
}
