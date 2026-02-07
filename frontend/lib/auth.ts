const TOKEN_KEY = 'care_formatter_token';

const inBrowser = () => typeof window !== 'undefined';

export const getToken = (): string | null => {
  if (!inBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (!inBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  if (!inBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
};
