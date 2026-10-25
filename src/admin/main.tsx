import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import { AdminApp } from "./AdminApp";
import "./admin.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AdminApp /></StrictMode>);
