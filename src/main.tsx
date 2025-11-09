import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { StorageProvider } from "./lib/storage/StorageContext.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <React.StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </React.StrictMode>
);
