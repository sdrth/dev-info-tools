import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

ReactDOM.createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
