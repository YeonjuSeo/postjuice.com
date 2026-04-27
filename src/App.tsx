import { Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/home-page";
import { PostPage } from "@/pages/post-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/post/:slug" element={<PostPage />} />
    </Routes>
  );
}
