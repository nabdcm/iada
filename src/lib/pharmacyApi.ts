// src/lib/pharmacyApi.ts
// fetch مع إرفاق توكن الجلسة تلقائياً — مطلوب لمسارات /api/pharmacy المحمية
import { supabase } from "./supabase";

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers || {});
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
