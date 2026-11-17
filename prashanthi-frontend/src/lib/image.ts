// Shrinks a photo in the browser so it is small enough to store and load fast.
export async function shrinkPhoto(file: File, maxSide = 720, limit = 200_000): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPG or PNG).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("That photo could not be opened."));
      i.src = url;
    });
    const k = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.78, 0.65, 0.5, 0.4]) {
      const out = c.toDataURL("image/jpeg", q);
      if (out.length < limit) return out;
    }
    throw new Error("That photo is too detailed. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
