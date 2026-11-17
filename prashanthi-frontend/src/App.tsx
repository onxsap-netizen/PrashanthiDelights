import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/store/Chrome";
import Account from "@/pages/Account";
import Cart from "@/pages/Cart";
import Categories from "@/pages/Categories";
import Checkout from "@/pages/Checkout";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import NotFound from "@/pages/NotFound";
import OrderPage from "@/pages/OrderPage";
import Policies from "@/pages/Policies";
import Product from "@/pages/Product";
import Track from "@/pages/Track";

// the admin dashboard (and its charting library) is only downloaded when staff open /admin
const Admin = lazy(() => import("@/pages/Admin"));

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:code" element={<OrderPage />} />
          <Route path="/track" element={<Track />} />
          <Route path="/account" element={<Account />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/admin" element={<Suspense fallback={<p className="p-6">Loading…</p>}><Admin /></Suspense>} />
      </Routes>
      <Toaster position="top-center" offset={72} toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "15px", borderRadius: "16px" } }} />
    </>
  );
}
