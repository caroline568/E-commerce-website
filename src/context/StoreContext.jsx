import { createContext, useContext, useEffect, useState } from "react";
import { requestApi } from "../services/api";
import { safePublicUrl } from "../lib/media";

const StoreContext = createContext(null);

export default function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    requestApi("/storefront", { signal: controller.signal })
      .then(({ data }) => setStore(data))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!store) return;
    document.documentElement.dataset.theme = store.theme || "heritage";
    document.title = `${store.name} — ${store.tagline || "Powered by Mavera"}`;
    const faviconUrl = safePublicUrl(store.faviconUrl);
    if (faviconUrl) {
      let icon = document.querySelector('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.append(icon);
      }
      icon.href = faviconUrl;
    }
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider.");
  return context;
}
