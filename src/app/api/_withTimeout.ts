// src/app/api/_withTimeout.ts
// غلاف مهلة زمنية لأي استدعاء خارجي (Supabase Auth خصوصاً) حتى لا تعلّق الدوال
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(p: PromiseLike<T>, ms: number, label = "operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    Promise.resolve(p).then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}

export const AUTH_TIMEOUT_MS = 20_000;
export const DB_TIMEOUT_MS   = 15_000;
