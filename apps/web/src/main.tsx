import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "@tcrn/ui-tokens/fonts.css";
import "@tcrn/ui-tokens/tokens.css";
import "@tcrn/ui-tokens/halloween.css";
import { tcrnComponentCss } from "@tcrn/ui-react/approved";
import "./styles/voxward.css";
import "./platform-protocols/youtube-sc.css";
import { router } from "./routes";

function ensureTcrnComponentStyles(): void {
  if (typeof document === "undefined") {
    return;
  }
  const styleId = "tcrn-component-styles";
  if (document.getElementById(styleId) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = tcrnComponentCss;
  document.head.appendChild(style);
}

ensureTcrnComponentStyles();

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("index.html is missing the #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
