import asyncio, uuid
from lib.db import db, ensure_indexes

MENU = [("Nel Pori Undai (6 pcs)", "Karthigai Bakshanam", 200), ("Aval Pori Undai (6 pcs)", "Karthigai Bakshanam", 200),
 ("Nei Appam (6 pcs)", "Karthigai Bakshanam", 200), ("Groundnut Undai (6 pcs)", "Karthigai Bakshanam", 150),
 ("Badusha 250g", "Sweets", 150), ("Ladu 250g", "Sweets", 150), ("Mysore Pak 250g", "Sweets", 200),
 ("Soan Papdi 250g", "Sweets", 200), ("Chocolate Burfi 250g", "Sweets", 200), ("Adirasam Small (5 pcs)", "Sweets", 80),
 ("Mixture 225g", "Savouries", 135), ("Ribbon Pakoda 225g", "Savouries", 125), ("Thattai 225g", "Savouries", 135),
 ("Kai Murukku 225g", "Savouries", 150), ("Karaboondhi 225g", "Savouries", 125), ("Karasev 225g", "Savouries", 125),
 ("Omapodi 225g", "Savouries", 125), ("Thenkuzhal Murukku 225g", "Savouries", 135), ("Muthusaram 225g", "Savouries", 135)]

async def main():
    await ensure_indexes()
    for n, c, p in MENU:
        await db.products.update_one({"name": n}, {"$setOnInsert": {"id": str(uuid.uuid4()), "name": n, "category": c, "price": p, "available": True}}, upsert=True)
    print("seeded", await db.products.count_documents({}), "products")

asyncio.run(main())
