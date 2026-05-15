"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { EventName, type ApnaApp, type ApnaIdentityDomain, type ApnaSocialDomain } from "@apna/sdk";
import { setCustomiseHighlight } from "@apna/sdk/ui";

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
        setApna(apna);
        setSocial(apna.social);
        setIdentity(apna.identity);
        setLoading(false);
        return offHighlight;
      };
      let cleanup: (() => void) | undefined;
      void init().then((offHighlight) => {
        cleanup = offHighlight;
      });
      return () => {
        cleanup?.();
      };
    }
  }, [toggleHighlight]);

  if (!apna || loading) return <div className="flex items-center justify-center min-h-screen">Booting the App...</div>;

  return (
    <ApnaContext.Provider value={{ apna, social, identity, isHighlighted, toggleHighlight }}>{children}</ApnaContext.Provider>
  );
}
