import { createContext, useContext, useEffect, useState } from "react";
import { requestApi } from "../services/api";

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    requestApi("/auth/session", { signal: controller.signal })
      .then(({ data }) => setUser(data.user))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Unable to restore the customer session.", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function signUp(email, password, displayName) {
    const { data } = await requestApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    setUser(data.user);
  }

  async function login(email, password) {
    const { data } = await requestApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  }

  async function logout() {
    await requestApi("/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
