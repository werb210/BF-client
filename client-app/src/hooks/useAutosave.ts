import { useEffect } from "react";

export function useAutosave(key: string, data: unknown) {
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE — non-essential autosave */
    }
  }, [key, data]);
}
