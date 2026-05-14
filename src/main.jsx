import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TouchUiRoot } from "./context/TouchUiContext";
import "./styles/app.css";
import "./styles/touch-mobile.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TouchUiRoot>
      <App />
    </TouchUiRoot>
  </React.StrictMode>
);