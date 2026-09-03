import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import RequesterSelect from "./components/RequesterSelect.js";
import AppShell from "./components/AppShell.js";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

function MainContent() {
  const { requester } = useRequester();

  // Lab 1 Health Check State for backwards compatibility and regression testing
  const [checkState, setCheckState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheck() {
    setCheckState("loading");
    setErrorMessage("");
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setCheckState("success");
    } catch {
      setErrorMessage("Unable to connect to TokTickIT API");
      setCheckState("error");
    }
  }

  if (!requester) {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zen-bg)" }}>
        {/* Requester Selection Screen */}
        <RequesterSelect />

        {/* Lab 1 System Health Check (Maintains zero regression on Lab 1 tests) */}
        <div className="container pb-5" style={{ maxWidth: 560 }}>
          <div className="zen-card p-4">
            <h1 className="h4 fw-bold mb-3" style={{ color: "var(--zen-text-primary)" }}>
              TokTickIT <span style={{ color: "var(--zen-primary)" }}>IT Service Desk</span>
            </h1>
            <p className="small text-muted mb-3">
              Lab 1 API Health Check & Categories Verification:
            </p>
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={handleCheck}
              disabled={checkState === "loading"}
            >
              {checkState === "loading" ? "⏳ Loading…" : "Check System"}
            </button>

            {checkState === "loading" && (
              <p className="mt-3 text-muted small">⏳ Loading…</p>
            )}

            {checkState === "success" && (
              <div className="mt-3">
                <p className="mb-2">
                  <strong>Status:</strong> <span className="text-success fw-bold">Online</span>
                </p>
                {categories.length > 0 && (
                  <>
                    <p className="mb-1 fw-semibold small">Supported Request Categories:</p>
                    <ol className="list-group list-group-numbered">
                      {categories.map((cat) => (
                        <li key={cat.id} className="list-group-item py-1 small">
                          {cat.name}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}

            {checkState === "error" && (
              <div className="alert alert-danger mt-3 py-2 small" role="alert">
                <strong>Status:</strong> Offline — {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <AppShell />;
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}
