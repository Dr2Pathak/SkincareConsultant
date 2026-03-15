/**
 * API client placeholder for future REST backend.
 * Replace mock calls in pages with these when the backend is ready.
 * Endpoints: /api/profile, /api/routine, /api/products, /api/compatibility, /api/chat
 */

import type { UserProfile, Routine, Product, CompatibilityResult } from "./types";

const API_BASE = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL ?? "";

const USER_MESSAGE = "Something went wrong. Please try again.";

export async function getProfile(): Promise<UserProfile> {
  const url = `${API_BASE}/api/profile`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Profile fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<UserProfile>;
}

export async function getRoutine(): Promise<Routine> {
  const url = `${API_BASE}/api/routine`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Routine fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<Routine>;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const url = `${API_BASE}/api/products?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Product search failed", { url, status: res.status, query: query.slice(0, 50) });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<Product[]>;
}

export async function getCompatibility(productId: string): Promise<CompatibilityResult> {
  const url = `${API_BASE}/api/compatibility?productId=${encodeURIComponent(productId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Compatibility fetch failed", { productId, url, status: res.status });
    throw new Error("We couldn't check this product right now. Please try again.");
  }
  return res.json() as Promise<CompatibilityResult>;
}

export async function sendChatMessage(message: string): Promise<{ reply: string }> {
  const url = `${API_BASE}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    console.error("Chat send failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<{ reply: string }>;
}
