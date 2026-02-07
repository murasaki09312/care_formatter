import { getToken } from './auth';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const REQUEST_TIMEOUT_MS = 15000;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

type ErrorBody = {
  error?: string;
  error_code?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = options.token ?? getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const errorBody = (parsed as ErrorBody | null) || {};
      throw new ApiError(
        response.status,
        errorBody.error_code || 'REQUEST_FAILED',
        errorBody.message || errorBody.error || 'リクエストに失敗しました'
      );
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'タイムアウトしました。時間をおいて再実行してください。');
    }

    throw new ApiError(500, 'UNKNOWN_ERROR', '通信エラーが発生しました');
  } finally {
    clearTimeout(timer);
  }
}
