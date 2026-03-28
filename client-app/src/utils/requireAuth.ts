import { getToken } from "../lib/auth";

export const requireAuth = () => {
  const token = getToken();

  if (!token) {
    throw new Error("User not authenticated");
  }

  return token;
};
