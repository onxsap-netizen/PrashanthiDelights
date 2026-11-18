import { Link } from "react-router-dom";
import { SweetArt } from "@/components/store/Art";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm px-4 pt-12 text-center">
      <div className="mx-auto size-36 overflow-hidden rounded-full ring-4 ring-gold/50"><SweetArt kind="murukku" seed={2} className="size-full" /></div>
      <h1 className="mt-5 font-display text-3xl font-semibold text-maroon-800">This page has gone missing</h1>
      <p className="mt-2 text-ink-soft">Let’s get you back to something sweet.</p>
      <Link to="/" className="mt-5 inline-grid h-14 place-items-center rounded-full bg-maroon-700 px-10 text-lg font-extrabold text-white">Back to home</Link>
    </div>
  );
}
