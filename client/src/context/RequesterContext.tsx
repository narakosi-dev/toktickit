import React, { createContext, useContext, useState, useEffect } from "react";
import { Requester } from "../api.js";

interface RequesterContextType {
  requester: Requester | null;
  setRequester: (r: Requester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

const STORAGE_KEY = "toktickit_selected_requester";

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requester, setRequesterState] = useState<Requester | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setRequester = (r: Requester) => {
    setRequesterState(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  };

  const clearRequester = () => {
    setRequesterState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <RequesterContext.Provider value={{ requester, setRequester, clearRequester }}>
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
