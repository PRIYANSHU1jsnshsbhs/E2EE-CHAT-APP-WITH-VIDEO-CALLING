import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router";

import "@livekit/components-styles";
import "./index.css";
import AppRoutes from "./config/routes.jsx";
import { ChatProvider } from "./context/chatContext.jsx";

// Bootstrap the React application and wrap it with the providers used everywhere:
// - BrowserRouter for page navigation
// - Toaster for popup notifications
// - ChatProvider for shared room/user session state
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster position="top-center" />
      <ChatProvider>
        <AppRoutes />
      </ChatProvider>
    </BrowserRouter>
  </StrictMode>,
);
