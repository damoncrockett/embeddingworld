import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App.js";
import "./assets/css/style.css";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
