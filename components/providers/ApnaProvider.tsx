"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { EventName, type ApnaApp, type ApnaIdentityDomain, type ApnaSocialDomain } from "@apna/sdk";
import { setCustomiseHighlight } from "@apna/sdk/ui";

const HOST_THEME_CHANGED_EVENT = "theme:changed";

type ApnaEventName = (typeof EventName)[keyof typeof EventName];
type HostResolvedTheme = "light" | "dark";

interface ApnaContextType {
  remoteComponentSelections?: {
    [appId: string]: {
      [remoteModuleName: string]: string
    }
  }
  apna?: ApnaApp;
  toggleHighlight: () => void;
  isHighlighted: boolean;
  /** High-level social domain — use apna.social.v1.* for new call sites. */
  social?: ApnaSocialDomain;
  /** High-level identity domain — use apna.identity.v1.* for new call sites. */
  identity?: ApnaIdentityDomain;
}

export const ApnaContext = createContext<ApnaContextType | null>(null);

export const useApna = () => {
  const context = useContext(ApnaContext);
  if (!context) {
    throw new Error("useApna must be used within a ApnaProvider");
  }
  return context;
};

export function ApnaProvider({ children }: { children: React.ReactNode }) {
  const [apna, setApna] = useState<ApnaApp>();
  const [social, setSocial] = useState<ApnaSocialDomain>();
  const [identity, setIdentity] = useState<ApnaIdentityDomain>();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [loading, setLoading] = useState(true);

  const toggleHighlight = useCallback(() => {
    setIsHighlighted(prev => {
      const next = !prev
      setCustomiseHighlight(next)
      return next
    })
  }, [])

  const applyHostTheme = useCallback((theme: HostResolvedTheme) => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const init = async () => {
        const { ApnaApp } = await import("@apna/sdk");
        const apna = new ApnaApp({ appId: "apna-nostr-mvp-1" });
        await apna.ready;
        const offHighlight = apna.on(
          EventName.CustomiseToggleHighlight,
          toggleHighlight
        );
        const offTheme = apna.on(
          HOST_THEME_CHANGED_EVENT as ApnaEventName,
          (payload) => {
            if (!isHostThemePayload(payload)) return
            applyHostTheme(payload.theme)
          }
        )
        setApna(apna);
        setSocial(apna.social);
        setIdentity(apna.identity);
        setLoading(false);
        return () => {
          offHighlight()
          offTheme()
        };
      };
      let cleanup: (() => void) | undefined;
      void init().then((offHighlight) => {
        cleanup = offHighlight;
      });
      return () => {
        cleanup?.();
      };
    }
  }, [applyHostTheme, toggleHighlight]);

  if (!apna || loading) return <div className="flex items-center justify-center min-h-screen">Booting the App...</div>;

  return (
    <ApnaContext.Provider value={{ apna, social, identity, isHighlighted, toggleHighlight }}>{children}</ApnaContext.Provider>
  );
}

function isHostThemePayload(
  payload: unknown
): payload is { theme: HostResolvedTheme } {
  if (!payload || typeof payload !== "object") return false
  const theme = (payload as { theme?: unknown }).theme
  return theme === "dark" || theme === "light"
}
