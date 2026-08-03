const DEFAULT_TIMEOUT_MS = 10_000;

export interface BaseUrlSanityCheckResult {
  reachable: boolean;
  errorMessage?: string;
}

type FetchLike = typeof fetch;

function connectionDetail(error: unknown): string {
  if (!(error instanceof Error)) return 'kesalahan jaringan tidak diketahui';
  const cause = error.cause as { code?: string; message?: string } | undefined;
  const code = cause?.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'nama host tidak dapat di-resolve (DNS)';
  if (code === 'ECONNREFUSED') return 'koneksi ditolak oleh host tujuan';
  if (code === 'ECONNRESET') return 'koneksi diputus oleh host tujuan';
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') return 'host atau jaringan tujuan tidak dapat dijangkau';
  return cause?.message || error.message;
}

export async function checkBaseUrlReachable(
  baseUrl: string | null | undefined,
  options: { timeoutMs?: number; fetchImpl?: FetchLike } = {},
): Promise<BaseUrlSanityCheckResult> {
  const value = baseUrl?.trim();
  if (!value) return { reachable: true };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { reachable: false, errorMessage: `Sanity check base URL gagal: URL tidak valid (${value})` };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { reachable: false, errorMessage: `Sanity check base URL gagal: protokol ${url.protocol} tidak didukung (gunakan http atau https)` };
  }
  if (url.username || url.password) {
    return { reachable: false, errorMessage: 'Sanity check base URL gagal: kredensial tidak boleh disertakan dalam URL' };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        reachable: false,
        errorMessage: `Sanity check base URL gagal: ${url.origin} merespons HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }
    return { reachable: true };
  } catch (error) {
    if (controller.signal.aborted) {
      return { reachable: false, errorMessage: `Sanity check base URL gagal: ${url.origin} tidak merespons dalam ${timeoutMs} ms` };
    }
    return { reachable: false, errorMessage: `Sanity check base URL gagal: ${url.origin} tidak dapat dijangkau — ${connectionDetail(error)}` };
  } finally {
    clearTimeout(timer);
  }
}
