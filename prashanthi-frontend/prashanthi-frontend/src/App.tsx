import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Shop from "@/pages/Shop";
import Track from "@/pages/Track";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/track" element={<Track />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Toaster />
    </>
  );
}
