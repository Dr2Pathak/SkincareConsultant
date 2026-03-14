/**
 * API client placeholder for future REST backend.
 * Replace mock calls in pages with these when the backend is ready.
 * Endpoints: /api/profile, /api/routine, /api/products, /api/compatibility, /api/chat
 */

const API_BASE = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL ?? "";

export async function getProfile(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function getRoutine(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/routine`);
  if (!res.ok) throw new Error("Failed to fetch routine");
  return res.json();
}

export async function searchProducts(query: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/products?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search products");
  return res.json();
}

export async function getCompatibility(productId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/compatibility?productId=${encodeURIComponent(productId)}`);
  if (!res.ok) throw new Error("Failed to get compatibility");
  return res.json();
}

export async function sendChatMessage(message: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}
