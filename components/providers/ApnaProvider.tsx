"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { INostr } from "@apna/sdk";

interface ApnaContextType {
  remoteComponentSelections?: {
    [appId: string]: {
      [remoteModuleName: string]: string
    }
  }
  toggleHighlight: () => void;
  isHighlighted: boolean;
  nostr: INostr;
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
  const [nostr, setNostr] = useState<INostr>();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [loading, setLoading] = useState(true);

  const toggleHighlight = () => {
    setIsHighlighted(prev => {
      console.log(`toggled from ${prev} to ${!prev}`)
      return !prev
    })
  }

  if (typeof window !== "undefined") {
    // @ts-ignore
    window.toggleHighlight = toggleHighlight
  }
  
  useEffect(() => {
    console.log("useEffect of ApnaProvider!!")
    if (typeof window !== "undefined") {
      const init = async () => {
        const { ApnaApp } = await import("@apna/sdk");
        const apna = new ApnaApp({ appId: "apna-nostr-mvp-1" });
        setNostr(apna.nostr);
        setLoading(false);
        console.log(
          "nostr.getProfile return value: ",
          await apna.nostr.getActiveUserProfile()
        );
      };
      init();
    }
  }, []);

  if (!nostr || loading) return <div className="flex items-center justify-center min-h-screen">Booting the App...</div>;  

  return (
    <ApnaContext.Provider value={{ nostr, isHighlighted, toggleHighlight }}>{children}</ApnaContext.Provider>
  );
}
