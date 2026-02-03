"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";

interface Product {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
}

const productsPath = path.join(process.cwd(), "..", "products.json");
const imagesDir = path.join(process.cwd(), "public", "products");

function getProducts(): Product[] {
  try {
    const data = fs.readFileSync(productsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveProducts(products: Product[]) {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
}

export async function addProduct(formData: FormData) {
  const url = formData.get("url") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const imageFile = formData.get("image") as File;

  if (!url || !title) {
    return { error: "URL and title are required" };
  }

  let imagePath = "";

  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = imageFile.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const fullPath = path.join(imagesDir, filename);

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);
    imagePath = `/products/${filename}`;
  }

  const products = getProducts();
  const newProduct: Product = {
    id: Date.now().toString(),
    url,
    title,
    description: description || "",
    image: imagePath,
    createdAt: new Date().toISOString(),
  };

  products.unshift(newProduct);
  saveProducts(products);

  revalidatePath("/products");
  revalidatePath("/admin/products");

  return { success: true, product: newProduct };
}

export async function deleteProduct(id: string) {
  const products = getProducts();
  const product = products.find((p) => p.id === id);

  if (product?.image) {
    const imagePath = path.join(process.cwd(), "public", product.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  const filtered = products.filter((p) => p.id !== id);
  saveProducts(filtered);

  revalidatePath("/products");
  revalidatePath("/admin/products");

  return { success: true };
}
