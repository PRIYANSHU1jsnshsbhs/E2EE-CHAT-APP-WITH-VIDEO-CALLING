import { Route, Routes } from "react-router";

import App from "../App.jsx";
import ChatPage from "../components/ChatPage.jsx";
import MeetingPage from "../components/MeetingPage.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing page where a user enters their name and room id. */}
      <Route path="/" element={<App />} />

      {/* Active chat room view. */}
      <Route path="/chat" element={<ChatPage />} />

      {/* Fixed: give the meeting page a real app route so chat can navigate into it. */}
      <Route path="/meeting" element={<MeetingPage />} />

      {/* Placeholder route left from initial scaffolding. */}
      <Route path="/about" element={<h1>About</h1>} />

      {/* Fallback route for unknown URLs. */}
      <Route path="*" element={<h1> 404 Not Found </h1>} />
    </Routes>
  );
};

export default AppRoutes;
