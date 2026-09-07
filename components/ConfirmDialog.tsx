"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((message: string) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirmFn = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  function handle(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {state && (
        <div className="bo-modal-overlay" onClick={() => handle(false)}>
          <div className="bo-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <p style={{ fontSize: 14, color: "var(--bo-text)", marginBottom: 20, lineHeight: 1.55 }}>
              {state.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="bo-btn" onClick={() => handle(false)} autoFocus>
                Annuler
              </button>
              <button className="bo-btn bo-btn-danger" onClick={() => handle(true)}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Remplace window.confirm() par une modale cohérente. Usage : if (!(await confirm("..."))) return; */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm doit être utilisé à l'intérieur de <ConfirmProvider>.");
  return ctx;
}
