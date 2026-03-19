import { AxiosError } from "axios";
import { clearSession } from "@/auth/session";
import { apiClient } from "./client";

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const onLoginPage = window.location.pathname === "/login";
      if (!onLoginPage) {
        clearSession();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
