"use server";

import { revalidatePath } from "next/cache";
import { createAuthServerClient, createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getWatchCategories as getWatchCategoriesLib } from "@/lib/watch-categories";
import { DEFAULT_FOOTER, type FooterSettings } from "@/lib/footer-settings";
import { DEFAULT_FAQ, type FaqSettings } from "@/lib/faq-settings";
import { DEFAULT_HOME_STYLE_CARDS, type HomeStyleCards } from "@/lib/home-style-cards";
import { builtWatches } from "@/data/watches";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type ProductInput = {
  id?: string;
  name: string;
  description: string;
  specifications?: string | null;
  price: number;
  original_price?: number | null;
  image: string;
  stock: number;
  active: boolean;
  category?: string | null;
  free_shipping?: boolean;
};

async function requireAdmin() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    throw new Error("Unauthorized");
  }
  return { supabase, user };
}

export async function getAdminProducts() {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateProduct(input: ProductInput & { id: string }) {
  await requireAdmin();
  
  // Validate inputs
  if (!input.id || input.id.length > 100) {
    throw new Error("Invalid product ID");
  }
  if (!input.name || input.name.length > 200) {
    throw new Error("Invalid product name");
  }
  if (input.price < 0 || input.price > 1000000) {
    throw new Error("Price must be between 0 and 1,000,000");
  }
  if (input.stock < 0 || input.stock > 100000) {
    throw new Error("Stock must be between 0 and 100,000");
  }
  if (input.original_price != null && (Number(input.original_price) < 0 || Number(input.original_price) < input.price)) {
    throw new Error("Original price must be greater than or equal to current price");
  }
  const supabase = createServerClient();
  const { id, ...rest } = input;
  const updatePayload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (typeof (rest as { free_shipping?: boolean }).free_shipping === "boolean") {
    updatePayload.free_shipping = (rest as { free_shipping: boolean }).free_shipping;
  }
  const { error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function createProduct(input: ProductInput) {
  await requireAdmin();
  
  // Validate inputs
  if (!input.name || input.name.length > 200) {
    throw new Error("Invalid product name");
  }
  if (input.price < 0 || input.price > 1000000) {
    throw new Error("Price must be between 0 and 1,000,000");
  }
  if (input.stock < 0 || input.stock > 100000) {
    throw new Error("Stock must be between 0 and 100,000");
  }
  if (input.original_price != null && (Number(input.original_price) < 0 || Number(input.original_price) < input.price)) {
    throw new Error("Original price must be greater than or equal to current price");
  }
  const supabase = createServerClient();
  const id =
    input.id ??
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  
  if (!id || id.length > 100) {
    throw new Error("Invalid product ID");
  }
  
  const { error } = await supabase.from("products").insert({
    id,
    name: input.name,
    description: input.description,
    specifications: input.specifications ?? null,
    price: input.price,
    original_price: input.original_price ?? null,
    image: input.image || "/images/hero-1.svg",
    stock: input.stock ?? 0,
    active: input.active ?? true,
    category: input.category || null,
    free_shipping: input.free_shipping ?? false,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  
  // Validate input
  if (!id || id.length > 100) {
    throw new Error("Invalid product ID");
  }
  
  const supabase = createServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Upload a product image to Supabase Storage. Returns the public URL. Admin only. */
export async function uploadProductImage(formData: FormData): Promise<{ url: string }> {
  await requireAdmin();

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) {
    throw new Error("No image file provided");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be under 5MB");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Image must be JPEG, PNG, WebP, or GIF");
  }

  const supabase = createServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  // Ensure bucket exists (ignore error if already exists)
  const { error: bucketError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });
  if (bucketError && !String(bucketError.message).toLowerCase().includes("already exists")) {
    throw new Error(bucketError.message);
  }

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);

  return { url: urlData.publicUrl };
}

/** Upload a category image for "Select your style" cards. Admin only. */
export async function uploadCategoryImage(formData: FormData): Promise<{ url: string }> {
  await requireAdmin();
  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) throw new Error("No image file provided");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Image must be under 5MB");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Image must be JPEG, PNG, WebP, or GIF");
  const supabase = createServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `categories/${crypto.randomUUID()}.${ext}`;
  const { error: bucketError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });
  if (bucketError && !String(bucketError.message).toLowerCase().includes("already exists")) {
    throw new Error(bucketError.message);
  }
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl };
}

// ——— Journal (admin only) ———
type JournalPostInput = {
  title: string;
  excerpt: string;
  body?: string | null;
  published_at?: string;
  locale?: string;
};

export async function getAdminJournalPosts() {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createJournalPost(input: JournalPostInput) {
  await requireAdmin();
  if (!input.title || input.title.length > 500) throw new Error("Invalid title");
  const supabase = createServerClient();
  const { error } = await supabase.from("journal_posts").insert({
    title: input.title,
    excerpt: input.excerpt ?? "",
    body: input.body ?? null,
    published_at: input.published_at ?? new Date().toISOString(),
    locale: input.locale ?? "en",
  });
  if (error) throw error;
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateJournalPost(id: string, input: JournalPostInput) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  if (!input.title || input.title.length > 500) throw new Error("Invalid title");
  const supabase = createServerClient();
  const { error } = await supabase
    .from("journal_posts")
    .update({
      title: input.title,
      excerpt: input.excerpt ?? "",
      body: input.body ?? null,
      published_at: input.published_at ?? undefined,
      locale: input.locale ?? "en",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteJournalPost(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("journal_posts").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Watch categories (public read for nav; admin CRUD) ———
export type WatchCategoryRow = Awaited<ReturnType<typeof getWatchCategoriesLib>>[number];

export async function getAdminWatchCategories(): Promise<WatchCategoryRow[]> {
  await requireAdmin();
  return getWatchCategoriesLib();
}

export async function createWatchCategory(input: {
  slug: string;
  label_en: string;
  label_fr: string;
  sort_order?: number;
  image_url?: string | null;
  display_price?: number | null;
}) {
  await requireAdmin();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Invalid slug");
  const supabase = createServerClient();
  const { error } = await supabase.from("watch_categories").insert({
    slug,
    label_en: input.label_en?.trim() || slug,
    label_fr: input.label_fr?.trim() || input.label_en?.trim() || slug,
    sort_order: input.sort_order ?? 0,
    image_url: input.image_url ?? null,
    display_price: input.display_price ?? null,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateWatchCategory(
  id: string,
  input: { slug?: string; label_en?: string; label_fr?: string; sort_order?: number; image_url?: string | null; display_price?: number | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { data: existing } = await supabase.from("watch_categories").select("slug").eq("id", id).single();
  const oldSlug = existing?.slug;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let newSlug: string | undefined;
  if (input.slug !== undefined) {
    newSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (newSlug) updates.slug = newSlug;
  }
  if (input.label_en !== undefined) updates.label_en = input.label_en;
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.display_price !== undefined) updates.display_price = input.display_price;
  const { error } = await supabase.from("watch_categories").update(updates).eq("id", id);
  if (error) throw error;
  if (oldSlug && newSlug && oldSlug !== newSlug) {
    await supabase.from("products").update({ category: newSlug }).eq("category", oldSlug);
  }
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function reorderWatchCategory(categoryId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  if (!categoryId) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { data: rows, error: fetchErr } = await supabase
    .from("watch_categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (fetchErr || !rows?.length) return;
  const idx = rows.findIndex((r: { id: string }) => r.id === categoryId);
  if (idx === -1) return;
  const prevIdx = direction === "up" ? idx - 1 : idx + 1;
  if (prevIdx < 0 || prevIdx >= rows.length) return;
  const current = rows[idx] as { id: string; sort_order: number };
  const neighbour = rows[prevIdx] as { id: string; sort_order: number };
  await updateWatchCategory(current.id, { sort_order: neighbour.sort_order });
  await updateWatchCategory(neighbour.id, { sort_order: current.sort_order });
}

export async function deleteWatchCategory(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { data: cat } = await supabase.from("watch_categories").select("slug").eq("id", id).single();
  if (cat?.slug) {
    await supabase.from("products").update({ category: null }).eq("category", cat.slug);
  }
  const { error } = await supabase.from("watch_categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Product images (multiple per product) ———
export type ProductImageRow = { id: string; product_id: string; url: string; sort_order: number };

export async function getProductImages(productId: string): Promise<ProductImageRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, product_id, url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminProductImages(productId: string): Promise<ProductImageRow[]> {
  await requireAdmin();
  return getProductImages(productId);
}

export async function addProductImage(productId: string, url: string, sortOrder?: number) {
  await requireAdmin();
  if (!productId || !url) throw new Error("productId and url required");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    url,
    sort_order: sortOrder ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function removeProductImage(imageId: string) {
  await requireAdmin();
  if (!imageId) throw new Error("Invalid image id");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function setProductImagesOrder(productId: string, imageIdsInOrder: string[]) {
  await requireAdmin();
  if (!productId) throw new Error("productId required");
  const supabase = createServerClient();
  for (let i = 0; i < imageIdsInOrder.length; i++) {
    await supabase.from("product_images").update({ sort_order: i }).eq("id", imageIdsInOrder[i]).eq("product_id", productId);
  }
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Product bands (watch bands / colorways for pre-built products) ———
export type ProductBandRow = {
  id: string;
  product_id: string;
  title: string;
  image_url: string;
  sort_order: number;
};

export async function getAdminProductBands(productId: string): Promise<ProductBandRow[]> {
  await requireAdmin();
  if (!productId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_bands")
    .select("id, product_id, title, image_url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    product_id: (r as { product_id: string }).product_id,
    title: (r as { title: string }).title,
    image_url: (r as { image_url: string }).image_url,
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
  }));
}

export async function addProductBand(productId: string, title: string, imageUrl: string, sortOrder?: number) {
  await requireAdmin();
  if (!productId || productId.length > 100) throw new Error("Invalid product ID");
  if (!title || title.length > 200) throw new Error("Title must be 1–200 characters");
  if (!imageUrl || imageUrl.length > 2000) throw new Error("Invalid image URL");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_bands").insert({
    product_id: productId,
    title: title.trim(),
    image_url: imageUrl.trim(),
    sort_order: sortOrder ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateProductBand(bandId: string, input: { title?: string; image_url?: string }) {
  await requireAdmin();
  if (!bandId) throw new Error("Invalid band ID");
  if (input.title !== undefined && (input.title.length > 200 || !input.title.trim())) throw new Error("Title must be 1–200 characters");
  if (input.image_url !== undefined && (input.image_url.length > 2000 || !input.image_url.trim())) throw new Error("Invalid image URL");
  const supabase = createServerClient();
  const updates: { title?: string; image_url?: string } = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url.trim();
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("product_bands").update(updates).eq("id", bandId);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteProductBand(bandId: string) {
  await requireAdmin();
  if (!bandId) throw new Error("Invalid band ID");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_bands").delete().eq("id", bandId);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Watch bracelets (reusable; assign to products via product_bracelets) ———
export type WatchBraceletRow = {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
};

export async function getAdminWatchBracelets(): Promise<WatchBraceletRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("watch_bracelets")
    .select("id, title, image_url, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    title: (r as { title: string }).title,
    image_url: (r as { image_url: string }).image_url,
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
  }));
}

export async function createWatchBracelet(input: { title: string; image_url: string; sort_order?: number }) {
  await requireAdmin();
  if (!input.title?.trim() || input.title.length > 200) throw new Error("Title must be 1–200 characters");
  if (!input.image_url?.trim() || input.image_url.length > 2000) throw new Error("Invalid image URL");
  const supabase = createServerClient();
  const { error } = await supabase.from("watch_bracelets").insert({
    title: input.title.trim(),
    image_url: input.image_url.trim(),
    sort_order: input.sort_order ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateWatchBracelet(id: string, input: { title?: string; image_url?: string; sort_order?: number }) {
  await requireAdmin();
  if (!id) throw new Error("Invalid bracelet ID");
  if (input.title !== undefined && (input.title.length > 200 || !input.title.trim())) throw new Error("Title must be 1–200 characters");
  if (input.image_url !== undefined && (input.image_url.length > 2000 || !input.image_url.trim())) throw new Error("Invalid image URL");
  const supabase = createServerClient();
  const updates: { title?: string; image_url?: string; sort_order?: number; updated_at?: string } = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url.trim();
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  const { error } = await supabase.from("watch_bracelets").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteWatchBracelet(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid bracelet ID");
  const supabase = createServerClient();
  const { error } = await supabase.from("watch_bracelets").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Product IDs that have this bracelet (for admin Variants page: "apply to products"). */
export async function getBraceletProductIds(braceletId: string): Promise<string[]> {
  await requireAdmin();
  if (!braceletId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_bracelets")
    .select("product_id")
    .eq("bracelet_id", braceletId);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { product_id: string }).product_id);
}

/** All bracelets → product IDs (one query for Variants page). */
export async function getProductIdsByBracelet(): Promise<Record<string, string[]>> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase.from("product_bracelets").select("bracelet_id, product_id");
  if (error) throw error;
  const out: Record<string, string[]> = {};
  (data ?? []).forEach((r) => {
    const bid = (r as { bracelet_id: string }).bracelet_id;
    const pid = (r as { product_id: string }).product_id;
    if (!out[bid]) out[bid] = [];
    out[bid].push(pid);
  });
  return out;
}

/** Set which products offer this variant (from Variants page). Replaces assignment for this bracelet only. */
export async function setBraceletProducts(braceletId: string, productIds: string[]) {
  await requireAdmin();
  if (!braceletId) throw new Error("Invalid bracelet ID");
  const supabase = createServerClient();
  const { error: delError } = await supabase.from("product_bracelets").delete().eq("bracelet_id", braceletId);
  if (delError) throw delError;
  if (productIds.length === 0) {
    revalidatePath("/[locale]/shop", "page");
    revalidatePath("/[locale]/shop/product/[id]", "page");
    revalidatePath("/[locale]/account/admin", "page");
    return;
  }
  // Append at end of each product's variant list (get max sort_order per product)
  const rows: { product_id: string; bracelet_id: string; sort_order: number }[] = [];
  for (const productId of productIds) {
    const { data: existing } = await supabase
      .from("product_bracelets")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const maxOrder = (existing?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1;
    rows.push({ product_id: productId, bracelet_id: braceletId, sort_order: maxOrder + 1 });
  }
  const { error } = await supabase.from("product_bracelets").insert(rows);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Bracelets assigned to a product (for admin product edit). */
export async function getAdminProductBracelets(productId: string): Promise<{ bracelet_id: string; sort_order: number }[]> {
  await requireAdmin();
  if (!productId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_bracelets")
    .select("bracelet_id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    bracelet_id: (r as { bracelet_id: string }).bracelet_id,
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
  }));
}

/** Set which bracelets are offered for a product (replaces existing). */
export async function setProductBracelets(productId: string, braceletIds: string[]) {
  await requireAdmin();
  if (!productId || productId.length > 100) throw new Error("Invalid product ID");
  const supabase = createServerClient();
  const { error: delError } = await supabase.from("product_bracelets").delete().eq("product_id", productId);
  if (delError) throw delError;
  if (braceletIds.length === 0) {
    revalidatePath("/[locale]/shop", "page");
    revalidatePath("/[locale]/shop/product/[id]", "page");
    revalidatePath("/[locale]/account/admin", "page");
    return;
  }
  const rows = braceletIds.map((bracelet_id, i) => ({ product_id: productId, bracelet_id, sort_order: i }));
  const { error } = await supabase.from("product_bracelets").insert(rows);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Fetch bracelets for a product (public, for product page). */
export async function getProductBracelets(productId: string): Promise<WatchBraceletRow[]> {
  if (!productId) return [];
  const supabase = createServerClient();
  const { data: links, error: linkError } = await supabase
    .from("product_bracelets")
    .select("bracelet_id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (linkError || !links?.length) return [];
  const { data: bracelets, error: braceError } = await supabase
    .from("watch_bracelets")
    .select("id, title, image_url, sort_order")
    .in("id", links.map((l) => (l as { bracelet_id: string }).bracelet_id));
  if (braceError || !bracelets?.length) return [];
  const orderMap = new Map(links.map((l) => [(l as { bracelet_id: string }).bracelet_id, (l as { sort_order?: number }).sort_order ?? 0]));
  return bracelets
    .map((r) => ({
      id: (r as { id: string }).id,
      title: (r as { title: string }).title,
      image_url: (r as { image_url: string }).image_url,
      sort_order: Number(orderMap.get((r as { id: string }).id) ?? (r as { sort_order?: number }).sort_order ?? 0),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ——— Product add-ons (Tailored Extras: Extra Strap, Engraving, etc.) ———
export type ProductAddonOptionRow = {
  id: string;
  addon_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  sort_order: number;
  image_url: string | null;
};

export type ProductAddonRow = {
  id: string;
  product_id: string;
  label_en: string;
  label_fr: string;
  image_url: string;
  sort_order: number;
};

export type ProductAddonWithOptionsRow = ProductAddonRow & { options: ProductAddonOptionRow[] };

/** Fetch add-ons with options for a product (for product page). */
export async function getProductAddonsWithOptions(productId: string): Promise<ProductAddonWithOptionsRow[]> {
  if (!productId) return [];
  const supabase = createServerClient();
  const { data: addons, error: addonsError } = await supabase
    .from("product_addons")
    .select("id, product_id, label_en, label_fr, image_url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (addonsError || !addons?.length) return [];
  const { data: optionsRows } = await supabase
    .from("product_addon_options")
    .select("id, addon_id, label_en, label_fr, price, sort_order, image_url")
    .in("addon_id", addons.map((a) => (a as { id: string }).id))
    .order("sort_order", { ascending: true });
  const optionsByAddon: Record<string, ProductAddonOptionRow[]> = {};
  addons.forEach((a) => (optionsByAddon[(a as { id: string }).id] = []));
  (optionsRows ?? []).forEach((r) => {
    const row = r as { id: string; addon_id: string; label_en: string; label_fr: string; price: number; sort_order: number; image_url?: string | null };
    const opt: ProductAddonOptionRow = {
      id: row.id,
      addon_id: row.addon_id,
      label_en: row.label_en,
      label_fr: row.label_fr,
      price: Number(row.price),
      sort_order: Number(row.sort_order ?? 0),
      image_url: row.image_url ?? null,
    };
    if (optionsByAddon[row.addon_id]) optionsByAddon[row.addon_id].push(opt);
  });
  return addons.map((a) => {
    const row = a as { id: string; product_id: string; label_en: string; label_fr: string; image_url: string; sort_order: number };
    return {
      ...row,
      sort_order: Number(row.sort_order ?? 0),
      options: optionsByAddon[row.id] ?? [],
    };
  });
}

export async function getAdminProductAddons(productId: string): Promise<ProductAddonRow[]> {
  await requireAdmin();
  if (!productId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_addons")
    .select("id, product_id, label_en, label_fr, image_url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    product_id: (r as { product_id: string }).product_id,
    label_en: (r as { label_en: string }).label_en,
    label_fr: (r as { label_fr: string }).label_fr,
    image_url: (r as { image_url: string }).image_url,
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
  }));
}

export async function getProductAddonOptions(addonId: string): Promise<ProductAddonOptionRow[]> {
  await requireAdmin();
  if (!addonId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_addon_options")
    .select("id, addon_id, label_en, label_fr, price, sort_order, image_url")
    .eq("addon_id", addonId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    addon_id: (r as { addon_id: string }).addon_id,
    label_en: (r as { label_en: string }).label_en,
    label_fr: (r as { label_fr: string }).label_fr,
    price: Number((r as { price: number }).price),
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
    image_url: (r as { image_url?: string | null }).image_url ?? null,
  }));
}

export async function createProductAddon(input: {
  product_id: string;
  label_en: string;
  label_fr: string;
  image_url: string;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.product_id || !input.label_en?.trim()) throw new Error("Product and label required");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_addons").insert({
    product_id: input.product_id,
    label_en: input.label_en.trim(),
    label_fr: (input.label_fr ?? input.label_en).trim(),
    image_url: (input.image_url ?? "").trim() || "/images/hero-1.svg",
    sort_order: input.sort_order ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateProductAddon(
  id: string,
  input: { label_en?: string; label_fr?: string; image_url?: string }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid addon id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim();
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr.trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url.trim();
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("product_addons").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteProductAddon(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid addon id");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_addons").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function createProductAddonOption(input: {
  addon_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  sort_order?: number;
  image_url?: string | null;
}) {
  await requireAdmin();
  if (!input.addon_id || !input.label_en?.trim()) throw new Error("Addon and label required");
  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    addon_id: input.addon_id,
    label_en: input.label_en.trim(),
    label_fr: (input.label_fr ?? input.label_en).trim(),
    price: Math.max(0, Number(input.price ?? 0)),
    sort_order: input.sort_order ?? 0,
  };
  if (input.image_url !== undefined && input.image_url !== null && String(input.image_url).trim() !== "") {
    row.image_url = String(input.image_url).trim();
  }
  const { error } = await supabase.from("product_addon_options").insert(row);
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateProductAddonOption(
  id: string,
  input: { label_en?: string; label_fr?: string; price?: number; image_url?: string | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid option id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim();
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr.trim();
  if (input.price !== undefined) updates.price = Math.max(0, Number(input.price));
  if (input.image_url !== undefined) updates.image_url = input.image_url === null || input.image_url === "" ? null : String(input.image_url).trim();
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("product_addon_options").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteProductAddonOption(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid option id");
  const supabase = createServerClient();
  const { error } = await supabase.from("product_addon_options").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** List all add-ons with product name for bulk-assign dropdown. */
export type AddonWithProductRow = { addon_id: string; addon_label_en: string; addon_label_fr: string; product_id: string; product_name: string };

export async function getAddonsWithProductNames(): Promise<AddonWithProductRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data: addons, error: addonsErr } = await supabase
    .from("product_addons")
    .select("id, product_id, label_en, label_fr");
  if (addonsErr || !addons?.length) return [];
  const productIds = [...new Set(addons.map((a) => (a as { product_id: string }).product_id))];
  const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
  const nameById = new Map((products ?? []).map((p) => [(p as { id: string }).id, (p as { name: string }).name]));
  return addons.map((a) => {
    const row = a as { id: string; product_id: string; label_en: string; label_fr: string };
    return {
      addon_id: row.id,
      addon_label_en: row.label_en,
      addon_label_fr: row.label_fr,
      product_id: row.product_id,
      product_name: nameById.get(row.product_id) ?? row.product_id,
    };
  });
}

/** Clone an add-on (and all its options) to one or more products. Skips the add-on's current product. */
export async function cloneAddonToProducts(addonId: string, productIds: string[]): Promise<{ cloned: number; skipped: number }> {
  await requireAdmin();
  if (!addonId || !Array.isArray(productIds) || productIds.length === 0) {
    return { cloned: 0, skipped: 0 };
  }
  const supabase = createServerClient();
  const { data: addon, error: addonErr } = await supabase
    .from("product_addons")
    .select("id, product_id, label_en, label_fr, image_url, sort_order")
    .eq("id", addonId)
    .single();
  if (addonErr || !addon) throw new Error("Add-on not found");
  const addonRow = addon as { id: string; product_id: string; label_en: string; label_fr: string; image_url: string; sort_order: number };
  const { data: options } = await supabase
    .from("product_addon_options")
    .select("id, label_en, label_fr, price, sort_order, image_url")
    .eq("addon_id", addonId)
    .order("sort_order", { ascending: true });
  const optionRows = (options ?? []) as { label_en: string; label_fr: string; price: number; sort_order: number; image_url?: string | null }[];
  const targetIds = productIds.filter((id) => id && id !== addonRow.product_id);
  let cloned = 0;
  for (const productId of targetIds) {
    const { data: newAddon, error: insAddonErr } = await supabase
      .from("product_addons")
      .insert({
        product_id: productId,
        label_en: addonRow.label_en,
        label_fr: addonRow.label_fr,
        image_url: addonRow.image_url || "/images/hero-1.svg",
        sort_order: addonRow.sort_order ?? 0,
      })
      .select("id")
      .single();
    if (insAddonErr || !newAddon) continue;
    const newAddonId = (newAddon as { id: string }).id;
    for (const opt of optionRows) {
      await supabase.from("product_addon_options").insert({
        addon_id: newAddonId,
        label_en: opt.label_en,
        label_fr: opt.label_fr,
        price: Number(opt.price),
        sort_order: Number(opt.sort_order ?? 0),
        image_url: opt.image_url ?? null,
      });
    }
    cloned++;
  }
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
  return { cloned, skipped: targetIds.length - cloned };
}

// ——— Add-on templates (library: create add-on + options, then apply to products) ———
export type AddonTemplateRow = {
  id: string;
  label_en: string;
  label_fr: string;
  image_url: string;
  sort_order: number;
  created_at?: string;
};

export type AddonTemplateOptionRow = {
  id: string;
  addon_template_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  image_url: string | null;
  sort_order: number;
};

export async function getAdminAddonTemplates(): Promise<(AddonTemplateRow & { option_count?: number })[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("addon_templates")
    .select("id, label_en, label_fr, image_url, sort_order, created_at")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const templates = (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    label_en: (r as { label_en: string }).label_en,
    label_fr: (r as { label_fr: string }).label_fr,
    image_url: (r as { image_url: string }).image_url ?? "/images/hero-1.svg",
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
    created_at: (r as { created_at?: string }).created_at,
  }));
  if (templates.length === 0) return templates;
  const { data: optCounts } = await supabase
    .from("addon_template_options")
    .select("addon_template_id");
  const countByTemplate: Record<string, number> = {};
  templates.forEach((t) => (countByTemplate[t.id] = 0));
  (optCounts ?? []).forEach((r) => {
    const id = (r as { addon_template_id: string }).addon_template_id;
    if (countByTemplate[id] !== undefined) countByTemplate[id]++;
  });
  return templates.map((t) => ({ ...t, option_count: countByTemplate[t.id] ?? 0 }));
}

export async function getAddonTemplateOptions(templateId: string): Promise<AddonTemplateOptionRow[]> {
  await requireAdmin();
  if (!templateId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("addon_template_options")
    .select("id, addon_template_id, label_en, label_fr, price, image_url, sort_order")
    .eq("addon_template_id", templateId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    addon_template_id: (r as { addon_template_id: string }).addon_template_id,
    label_en: (r as { label_en: string }).label_en,
    label_fr: (r as { label_fr: string }).label_fr,
    price: Number((r as { price: number }).price),
    image_url: (r as { image_url?: string | null }).image_url ?? null,
    sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
  }));
}

export async function createAddonTemplate(input: { label_en: string; label_fr: string; image_url?: string }) {
  await requireAdmin();
  if (!input.label_en?.trim()) throw new Error("Label required");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("addon_templates")
    .insert({
      label_en: input.label_en.trim(),
      label_fr: (input.label_fr ?? input.label_en).trim(),
      image_url: (input.image_url ?? "").trim() || "/images/hero-1.svg",
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/addons", "page");
  return (data as { id: string }).id;
}

export async function updateAddonTemplate(id: string, input: { label_en?: string; label_fr?: string; image_url?: string }) {
  await requireAdmin();
  if (!id) throw new Error("Invalid template id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim();
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr.trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url.trim();
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("addon_templates").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin/addons", "page");
}

export async function deleteAddonTemplate(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid template id");
  const supabase = createServerClient();
  const { error } = await supabase.from("addon_templates").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin/addons", "page");
}

export async function createAddonTemplateOption(input: {
  addon_template_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  image_url?: string | null;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.addon_template_id || !input.label_en?.trim()) throw new Error("Template and label required");
  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    addon_template_id: input.addon_template_id,
    label_en: input.label_en.trim(),
    label_fr: (input.label_fr ?? input.label_en).trim(),
    price: Math.max(0, Number(input.price ?? 0)),
    sort_order: input.sort_order ?? 0,
  };
  if (input.image_url !== undefined && input.image_url !== null && String(input.image_url).trim() !== "") {
    row.image_url = String(input.image_url).trim();
  }
  const { error } = await supabase.from("addon_template_options").insert(row);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin/addons", "page");
}

export async function updateAddonTemplateOption(
  id: string,
  input: { label_en?: string; label_fr?: string; price?: number; image_url?: string | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid option id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim();
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr.trim();
  if (input.price !== undefined) updates.price = Math.max(0, Number(input.price));
  if (input.image_url !== undefined) updates.image_url = input.image_url === null || input.image_url === "" ? null : String(input.image_url).trim();
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("addon_template_options").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin/addons", "page");
}

export async function deleteAddonTemplateOption(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid option id");
  const supabase = createServerClient();
  const { error } = await supabase.from("addon_template_options").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin/addons", "page");
}

/** Returns product IDs that have this add-on template applied. Used to pre-check the Apply modal. */
export async function getProductIdsWithAddonTemplate(templateId: string): Promise<string[]> {
  await requireAdmin();
  if (!templateId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("product_addons")
    .select("product_id")
    .eq("addon_template_id", templateId);
  if (error) return [];
  return ((data ?? []) as { product_id: string }[]).map((r) => r.product_id);
}

/** Apply a template (add-on + all options) to selected products. Replaces current assignments: unchecked products lose the add-on. */
export async function applyAddonTemplateToProducts(templateId: string, productIds: string[]): Promise<{ applied: number; removedAll?: boolean }> {
  await requireAdmin();
  if (!templateId || !Array.isArray(productIds)) return { applied: 0, removedAll: false };
  const supabase = createServerClient();
  const { data: template, error: tErr } = await supabase
    .from("addon_templates")
    .select("id, label_en, label_fr, image_url, sort_order")
    .eq("id", templateId)
    .single();
  if (tErr || !template) throw new Error("Add-on template not found");
  const t = template as { label_en: string; label_fr: string; image_url: string; sort_order: number };
  // Remove add-on from products no longer selected (supports unchecking to remove)
  await supabase
    .from("product_addons")
    .delete()
    .eq("addon_template_id", templateId);
  if (productIds.length === 0) {
    revalidatePath("/[locale]/shop/product/[id]", "page");
    revalidatePath("/[locale]/account/admin/addons", "page");
    return { applied: 0, removedAll: true };
  }
  const { data: opts } = await supabase
    .from("addon_template_options")
    .select("label_en, label_fr, price, image_url, sort_order")
    .eq("addon_template_id", templateId)
    .order("sort_order", { ascending: true });
  const options = (opts ?? []) as { label_en: string; label_fr: string; price: number; image_url?: string | null; sort_order: number }[];
  let applied = 0;
  for (const productId of productIds) {
    if (!productId) continue;
    const { data: newAddon, error: insErr } = await supabase
      .from("product_addons")
      .insert({
        product_id: productId,
        addon_template_id: templateId,
        label_en: t.label_en,
        label_fr: t.label_fr,
        image_url: t.image_url || "/images/hero-1.svg",
        sort_order: t.sort_order ?? 0,
      })
      .select("id")
      .single();
    if (insErr || !newAddon) continue;
    const addonId = (newAddon as { id: string }).id;
    for (const opt of options) {
      await supabase.from("product_addon_options").insert({
        addon_id: addonId,
        label_en: opt.label_en,
        label_fr: opt.label_fr,
        price: Number(opt.price),
        sort_order: Number(opt.sort_order ?? 0),
        image_url: opt.image_url ?? null,
      });
    }
    applied++;
  }
  revalidatePath("/[locale]/shop/product/[id]", "page");
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/addons", "page");
  return { applied, removedAll: false };
}

// ——— Footer (admin-editable, stored in site_settings) ———
/** Public: get footer content. Returns default if not set. */
export async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "footer")
      .single();
    if (error || !data?.value) return DEFAULT_FOOTER;
    const parsed = JSON.parse((data as { value: string }).value) as Partial<FooterSettings>;
    return { ...DEFAULT_FOOTER, ...parsed } as FooterSettings;
  } catch {
    return DEFAULT_FOOTER;
  }
}

export async function setFooterSettings(data: FooterSettings) {
  await requireAdmin();
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert(
    { key: "footer", value: JSON.stringify(data), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  revalidatePath("/[locale]", "layout");
  revalidatePath("/[locale]/account/admin/footer", "page");
}

// ——— FAQ (admin-editable Q&A page) ———
export async function getFaqSettings(): Promise<FaqSettings> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "faq")
      .single();
    if (error || !data?.value) return DEFAULT_FAQ;
    const parsed = JSON.parse((data as { value: string }).value) as Partial<FaqSettings>;
    const items = Array.isArray(parsed.items) ? parsed.items : DEFAULT_FAQ.items;
    return {
      heading_en: parsed.heading_en ?? DEFAULT_FAQ.heading_en,
      heading_fr: parsed.heading_fr ?? DEFAULT_FAQ.heading_fr,
      intro_en: parsed.intro_en ?? DEFAULT_FAQ.intro_en,
      intro_fr: parsed.intro_fr ?? DEFAULT_FAQ.intro_fr,
      items: items.map((item) => ({
        question_en: item.question_en ?? "",
        question_fr: item.question_fr ?? "",
        answer_en: item.answer_en ?? "",
        answer_fr: item.answer_fr ?? "",
      })),
    };
  } catch {
    return DEFAULT_FAQ;
  }
}

export async function setFaqSettings(data: FaqSettings) {
  await requireAdmin();
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert(
    { key: "faq", value: JSON.stringify(data), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  revalidatePath("/[locale]/faq", "page");
}

// ——— Home style cards (Custom Build + Shop, inline edit on home) ———
export async function getHomeStyleCards(): Promise<HomeStyleCards> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "home_style_cards")
      .single();
    if (error || !data?.value) return DEFAULT_HOME_STYLE_CARDS;
    const parsed = JSON.parse((data as { value: string }).value) as Partial<HomeStyleCards>;
    return {
      custom_build: { ...DEFAULT_HOME_STYLE_CARDS.custom_build, ...parsed.custom_build },
      shop: { ...DEFAULT_HOME_STYLE_CARDS.shop, ...parsed.shop },
    };
  } catch {
    return DEFAULT_HOME_STYLE_CARDS;
  }
}

export async function setHomeStyleCards(data: HomeStyleCards) {
  await requireAdmin();
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert(
    { key: "home_style_cards", value: JSON.stringify(data), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  revalidatePath("/[locale]", "page");
}

export async function uploadHomeCardImage(formData: FormData): Promise<{ url: string }> {
  await requireAdmin();
  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) throw new Error("No image file provided");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Image must be under 5MB");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Image must be JPEG, PNG, WebP, or GIF");
  const supabase = createServerClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `home-cards/${crypto.randomUUID()}.${ext}`;
  const { error: bucketError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });
  if (bucketError && !String(bucketError.message).toLowerCase().includes("already exists")) {
    throw new Error(bucketError.message);
  }
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl };
}

// ——— Home "Best of the collection" (inline edit on home) ———
export type HomeBestOfItem = { id: string; name: string; description: string; price: number; image: string };

export async function getHomeBestOf(): Promise<HomeBestOfItem[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "home_best_of")
      .single();
    if (error || !data?.value) return builtWatches as HomeBestOfItem[];
    return JSON.parse((data as { value: string }).value) as HomeBestOfItem[];
  } catch {
    return builtWatches as HomeBestOfItem[];
  }
}

export async function setHomeBestOf(items: HomeBestOfItem[]) {
  await requireAdmin();
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert(
    { key: "home_best_of", value: JSON.stringify(items), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  revalidatePath("/[locale]", "page");
}

// ——— Featured slides (landing hero carousel) ———
export type FeaturedSlideRow = {
  id: string;
  image_url: string;
  image_url_secondary: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  link_url: string | null;
  sort_order: number;
};

/** Public: fetch slides for landing hero. */
export async function getFeaturedSlides(): Promise<FeaturedSlideRow[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("featured_slides")
      .select("id, image_url, image_url_secondary, title, subtitle, description, link_url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAdminFeaturedSlides(): Promise<FeaturedSlideRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("featured_slides")
    .select("id, image_url, image_url_secondary, title, subtitle, description, link_url, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFeaturedSlide(input: {
  image_url: string;
  image_url_secondary?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  link_url?: string | null;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.image_url?.trim()) throw new Error("Image URL required");
  const supabase = createServerClient();
  const { error } = await supabase.from("featured_slides").insert({
    image_url: input.image_url.trim(),
    image_url_secondary: input.image_url_secondary?.trim() || null,
    title: input.title?.trim() || null,
    subtitle: input.subtitle?.trim() || null,
    description: input.description?.trim() || null,
    link_url: input.link_url?.trim() || null,
    sort_order: input.sort_order ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateFeaturedSlide(
  id: string,
  input: {
    image_url?: string;
    image_url_secondary?: string | null;
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    link_url?: string | null;
    sort_order?: number;
  }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.image_url_secondary !== undefined) updates.image_url_secondary = input.image_url_secondary || null;
  if (input.title !== undefined) updates.title = input.title || null;
  if (input.subtitle !== undefined) updates.subtitle = input.subtitle || null;
  if (input.description !== undefined) updates.description = input.description || null;
  if (input.link_url !== undefined) updates.link_url = input.link_url || null;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  const { error } = await supabase.from("featured_slides").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteFeaturedSlide(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("featured_slides").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Giveaway (single active campaign; appears on home featured when active) ———
const GIVEAWAY_CURRENT_ID = "00000000-0000-0000-0000-000000000001";

export type GiveawayRow = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** Public: fetch active giveaway for home page featured section. */
export async function getActiveGiveaway(): Promise<GiveawayRow | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("giveaways")
      .select("id, title, description, image_url, link_url, active, created_at, updated_at")
      .eq("id", GIVEAWAY_CURRENT_ID)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as GiveawayRow;
  } catch {
    return null;
  }
}

export async function getAdminGiveaway(): Promise<GiveawayRow | null> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("giveaways")
    .select("id, title, description, image_url, link_url, active, created_at, updated_at")
    .eq("id", GIVEAWAY_CURRENT_ID)
    .maybeSingle();
  if (error || !data) return null;
  return data as GiveawayRow;
}

export async function upsertGiveaway(input: {
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  active?: boolean;
}): Promise<void> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("giveaways")
    .select("id")
    .eq("id", GIVEAWAY_CURRENT_ID)
    .maybeSingle();

  const row = {
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    link_url: input.link_url?.trim() || null,
    active: input.active ?? false,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("giveaways").update(row).eq("id", GIVEAWAY_CURRENT_ID);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("giveaways").insert({
      id: GIVEAWAY_CURRENT_ID,
      ...row,
    });
    if (error) throw error;
  }
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/giveaway", "page");
}

/** Remove the giveaway: set active = false and clear content so it no longer shows on the homepage. */
export async function removeGiveaway(): Promise<void> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("giveaways")
    .select("id")
    .eq("id", GIVEAWAY_CURRENT_ID)
    .maybeSingle();

  const row = {
    title: null,
    description: null,
    image_url: null,
    link_url: null,
    active: false,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("giveaways").update(row).eq("id", GIVEAWAY_CURRENT_ID);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("giveaways").insert({
      id: GIVEAWAY_CURRENT_ID,
      ...row,
    });
    if (error) throw error;
  }
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/giveaway", "page");
}

// ——— Configurator (steps + options with images) ———
export type ConfiguratorStepRow = {
  id: string;
  label_en: string;
  label_fr: string;
  sort_order: number;
  step_key?: string | null;
  optional?: boolean;
  image_url?: string | null;
};
export type ConfiguratorOptionRow = {
  id: string;
  step_id: string;
  parent_option_id: string | null;
  label_en: string;
  label_fr: string;
  letter: string;
  price: number;
  discount_percent?: number | null;
  image_url: string | null;
  preview_image_url: string | null;
  layer_image_url?: string | null;
  layer_z_index?: number;
  sort_order: number;
  option_group_en?: string | null;
  option_group_fr?: string | null;
  group_id?: string | null;
};

export type ConfiguratorOptionGroupRow = {
  id: string;
  step_id: string;
  label_en: string;
  label_fr: string;
  image_url: string | null;
  sort_order: number;
};

/** Public: fetch steps in order (includes step_key and optional when present). */
export async function getConfiguratorSteps(): Promise<ConfiguratorStepRow[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("configurator_steps")
      .select("id, label_en, label_fr, sort_order, step_key, optional, image_url")
      .order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r) => ({
      ...r,
      step_key: (r as { step_key?: string }).step_key ?? null,
      optional: (r as { optional?: boolean }).optional ?? false,
      image_url: (r as { image_url?: string }).image_url ?? null,
    }));
  } catch {
    return [];
  }
}

/** Public: fetch options for a step; for step 1 use parentOptionId=null, for step 2+ pass selected option id from step 1 (function). */
export async function getConfiguratorOptions(stepId: string, parentOptionId: string | null): Promise<ConfiguratorOptionRow[]> {
  try {
    const supabase = createServerClient();
    let q = supabase
      .from("configurator_options")
      .select("id, step_id, parent_option_id, label_en, label_fr, letter, price, discount_percent, image_url, preview_image_url, sort_order")
      .eq("step_id", stepId)
      .order("sort_order", { ascending: true });
    if (parentOptionId === null) {
      q = q.is("parent_option_id", null);
    } else {
      q = q.eq("parent_option_id", parentOptionId);
    }
    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAdminConfiguratorSteps(): Promise<ConfiguratorStepRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_steps")
    .select("id, label_en, label_fr, sort_order, step_key, optional, image_url")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    step_key: (r as { step_key?: string }).step_key ?? null,
    optional: (r as { optional?: boolean }).optional ?? false,
    image_url: (r as { image_url?: string }).image_url ?? null,
  }));
}

/** Get options for the Function step (watch types: Oak, Naut, etc.). */
export async function getFunctionOptions(): Promise<ConfiguratorOptionRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data: step } = await supabase
    .from("configurator_steps")
    .select("id")
    .eq("step_key", "function")
    .maybeSingle();
  if (!step?.id) return [];
  const { data, error } = await supabase
    .from("configurator_options")
    .select("id, step_id, parent_option_id, label_en, label_fr, letter, price, discount_percent, image_url, preview_image_url, sort_order")
    .eq("step_id", step.id)
    .is("parent_option_id", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ConfiguratorOptionRow[];
}

/** Get step IDs (in order) that follow for a given function option. */
export async function getFunctionSteps(functionOptionId: string): Promise<string[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_function_steps")
    .select("step_id")
    .eq("function_option_id", functionOptionId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { step_id: string }) => r.step_id);
}

/** Set which steps (and order) follow for a function option. stepIds = array of configurator_steps.id. */
export async function setFunctionSteps(functionOptionId: string, stepIds: string[]): Promise<void> {
  await requireAdmin();
  if (!functionOptionId) throw new Error("Function option id required");
  const supabase = createServerClient();
  const { error: delError } = await supabase
    .from("configurator_function_steps")
    .delete()
    .eq("function_option_id", functionOptionId);
  if (delError) throw delError;
  if (stepIds.length > 0) {
    const rows = stepIds.map((step_id, i) => ({
      function_option_id: functionOptionId,
      step_id,
      sort_order: i,
    }));
    const { error: insError } = await supabase.from("configurator_function_steps").insert(rows);
    if (insError) throw insError;
  }
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function getAdminConfiguratorOptions(stepId?: string | null, parentOptionId?: string | null): Promise<ConfiguratorOptionRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const baseSelect = "id, step_id, parent_option_id, label_en, label_fr, letter, price, discount_percent, image_url, preview_image_url, layer_image_url, layer_z_index, sort_order";
  let q = supabase.from("configurator_options").select(`${baseSelect}, option_group_en, option_group_fr, group_id`).order("sort_order", { ascending: true });
  if (stepId) q = q.eq("step_id", stepId);
  if (parentOptionId === null) q = q.is("parent_option_id", null);
  else if (parentOptionId != null) q = q.eq("parent_option_id", parentOptionId);
  const { data, error } = await q;
  if (error) {
    let fallback = supabase.from("configurator_options").select(baseSelect).order("sort_order", { ascending: true });
    if (stepId) fallback = fallback.eq("step_id", stepId);
    if (parentOptionId === null) fallback = fallback.is("parent_option_id", null);
    else if (parentOptionId != null) fallback = fallback.eq("parent_option_id", parentOptionId);
    const { data: data2, error: err2 } = await fallback;
    if (err2) throw err2;
    return (data2 ?? []).map((r) => ({ ...r, group_id: null })) as ConfiguratorOptionRow[];
  }
  return (data ?? []) as ConfiguratorOptionRow[];
}

export async function createConfiguratorStep(input: {
  label_en: string;
  label_fr: string;
  sort_order?: number;
  step_key?: string | null;
  optional?: boolean;
  image_url?: string | null;
}) {
  await requireAdmin();
  if (!input.label_en?.trim()) throw new Error("Label required");
  const supabase = createServerClient();
  const row: Record<string, unknown> = {
    label_en: input.label_en.trim(),
    label_fr: input.label_fr?.trim() || input.label_en.trim(),
    sort_order: input.sort_order ?? 0,
  };
  if (input.step_key !== undefined) row.step_key = input.step_key || null;
  if (input.optional !== undefined) row.optional = input.optional;
  if (input.image_url !== undefined) row.image_url = input.image_url?.trim() || null;
  const { error } = await supabase.from("configurator_steps").insert(row);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateConfiguratorStep(
  id: string,
  input: { label_en?: string; label_fr?: string; sort_order?: number; step_key?: string | null; optional?: boolean; image_url?: string | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en;
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.step_key !== undefined) updates.step_key = input.step_key || null;
  if (input.optional !== undefined) updates.optional = input.optional;
  if (input.image_url !== undefined) updates.image_url = input.image_url?.trim() || null;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("configurator_steps").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteConfiguratorStep(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_steps").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function createConfiguratorOption(input: {
  step_id: string;
  parent_option_id?: string | null;
  label_en: string;
  label_fr?: string;
  letter: string;
  price: number;
  discount_percent?: number | null;
  image_url?: string | null;
  preview_image_url?: string | null;
  layer_image_url?: string | null;
  layer_z_index?: number;
  sort_order?: number;
  option_group_en?: string | null;
  option_group_fr?: string | null;
}) {
  await requireAdmin();
  if (!input.step_id || !input.label_en?.trim()) throw new Error("Step and label required");
  const supabase = createServerClient();
  const discount = input.discount_percent != null ? Math.min(100, Math.max(0, Number(input.discount_percent))) : 0;
  const { error } = await supabase.from("configurator_options").insert({
    step_id: input.step_id,
    parent_option_id: input.parent_option_id ?? null,
    label_en: input.label_en.trim(),
    label_fr: (input.label_fr ?? input.label_en).trim(),
    letter: (input.letter || "A").slice(0, 1),
    price: Number(input.price) ?? 0,
    discount_percent: discount,
    image_url: input.image_url ?? null,
    preview_image_url: input.preview_image_url ?? null,
    layer_image_url: input.layer_image_url ?? null,
    layer_z_index: input.layer_z_index ?? 0,
    sort_order: input.sort_order ?? 0,
    option_group_en: input.option_group_en?.trim() || null,
    option_group_fr: input.option_group_fr?.trim() || null,
  });
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateConfiguratorOption(
  id: string,
  input: {
    label_en?: string;
    label_fr?: string;
    letter?: string;
    price?: number;
    discount_percent?: number | null;
    image_url?: string | null;
    preview_image_url?: string | null;
    layer_image_url?: string | null;
    layer_z_index?: number;
    sort_order?: number;
    parent_option_id?: string | null;
    option_group_en?: string | null;
    option_group_fr?: string | null;
  }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en;
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr;
  if (input.letter !== undefined) updates.letter = input.letter.slice(0, 1);
  if (input.price !== undefined) updates.price = input.price;
  if (input.discount_percent !== undefined) updates.discount_percent = input.discount_percent == null ? 0 : Math.min(100, Math.max(0, Number(input.discount_percent)));
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.preview_image_url !== undefined) updates.preview_image_url = input.preview_image_url;
  if (input.layer_image_url !== undefined) updates.layer_image_url = input.layer_image_url;
  if (input.layer_z_index !== undefined) updates.layer_z_index = input.layer_z_index;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.parent_option_id !== undefined) updates.parent_option_id = input.parent_option_id;
  if (input.option_group_en !== undefined) updates.option_group_en = input.option_group_en?.trim() || null;
  if (input.option_group_fr !== undefined) updates.option_group_fr = input.option_group_fr?.trim() || null;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("configurator_options").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteConfiguratorOption(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_options").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Configurator option groups (admin selects options by checkbox, creates group with name + image) ———
export async function getOptionGroupsForStep(stepId: string): Promise<ConfiguratorOptionGroupRow[]> {
  await requireAdmin();
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("configurator_option_groups")
      .select("id, step_id, label_en, label_fr, image_url, sort_order")
      .eq("step_id", stepId)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []) as ConfiguratorOptionGroupRow[];
  } catch {
    return [];
  }
}

export async function createOptionGroup(input: {
  step_id: string;
  label_en: string;
  label_fr: string;
  image_url?: string | null;
  option_ids?: string[];
}): Promise<string> {
  await requireAdmin();
  if (!input.step_id || !input.label_en?.trim()) throw new Error("Step and group name required");
  const supabase = createServerClient();
  const { data: row, error: insErr } = await supabase
    .from("configurator_option_groups")
    .insert({
      step_id: input.step_id,
      label_en: input.label_en.trim(),
      label_fr: (input.label_fr ?? input.label_en).trim(),
      image_url: input.image_url?.trim() || null,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const groupId = row?.id;
  if (!groupId) throw new Error("Failed to create group");
  if (input.option_ids?.length) {
    const { error: upErr } = await supabase
      .from("configurator_options")
      .update({ group_id: groupId })
      .in("id", input.option_ids);
    if (upErr) throw upErr;
  }
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
  return groupId;
}

export async function updateOptionGroup(
  id: string,
  input: { label_en?: string; label_fr?: string; image_url?: string | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim();
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr?.trim() ?? (input.label_en ?? "").trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url?.trim() || null;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("configurator_option_groups").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteOptionGroup(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  await supabase.from("configurator_options").update({ group_id: null }).eq("group_id", id);
  const { error } = await supabase.from("configurator_option_groups").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Set group_id for given option ids (null = remove from group). */
export async function setOptionsGroupId(optionIds: string[], groupId: string | null) {
  await requireAdmin();
  const supabase = createServerClient();
  if (optionIds.length === 0) return;
  const { error } = await supabase
    .from("configurator_options")
    .update({ group_id: groupId })
    .in("id", optionIds);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

// ——— Configurator dropdown items (sub-options per configurator option, e.g. finish type for a case) ———
export type ConfiguratorDropdownItemRow = {
  id: string;
  option_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  sort_order: number;
  image_url: string | null;
};

export async function getDropdownItemsForOption(optionId: string): Promise<ConfiguratorDropdownItemRow[]> {
  await requireAdmin();
  if (!optionId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_dropdown_items")
    .select("id, option_id, label_en, label_fr, price, sort_order, image_url")
    .eq("option_id", optionId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    option_id: r.option_id,
    label_en: r.label_en,
    label_fr: r.label_fr,
    price: Number(r.price ?? 0),
    sort_order: Number(r.sort_order ?? 0),
    image_url: (r as { image_url?: string | null }).image_url ?? null,
  }));
}

export async function createDropdownItem(
  optionId: string,
  input: { label_en: string; label_fr: string; price?: number; sort_order?: number; image_url?: string | null }
) {
  await requireAdmin();
  if (!optionId) throw new Error("Invalid option id");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_dropdown_items")
    .insert({
      option_id: optionId,
      label_en: input.label_en.trim() || "Item",
      label_fr: input.label_fr.trim() || input.label_en.trim() || "Item",
      price: Number(input.price ?? 0),
      sort_order: Number(input.sort_order ?? 0),
      image_url: input.image_url?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin/configurator", "page");
  return data?.id;
}

export async function updateDropdownItem(
  id: string,
  input: { label_en?: string; label_fr?: string; price?: number; sort_order?: number; image_url?: string | null }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en.trim() || "Item";
  if (input.label_fr !== undefined) updates.label_fr = (input.label_fr.trim() || input.label_en) ?? "Item";
  if (input.price !== undefined) updates.price = Number(input.price);
  if (input.sort_order !== undefined) updates.sort_order = Number(input.sort_order);
  if (input.image_url !== undefined) updates.image_url = input.image_url?.trim() || null;
  const { error } = await supabase.from("configurator_dropdown_items").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin/configurator", "page");
}

export async function deleteDropdownItem(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_dropdown_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin/configurator", "page");
}

// ——— Configurator optional add-ons (e.g. Frosted Finish on Case step, available for specific options) ———
export type ConfiguratorAddonRow = {
  id: string;
  step_id: string;
  label_en: string;
  label_fr: string;
  price: number;
  sort_order: number;
};

export type ConfiguratorAddonWithOptionsRow = ConfiguratorAddonRow & { option_ids: string[] };

/** Public: fetch all add-ons with option_ids (which options make each add-on available). */
export async function getConfiguratorAddons(): Promise<ConfiguratorAddonWithOptionsRow[]> {
  try {
    const supabase = createServerClient();
    const { data: addons, error: addonsError } = await supabase
      .from("configurator_addons")
      .select("id, step_id, label_en, label_fr, price, sort_order")
      .order("sort_order", { ascending: true });
    if (addonsError || !addons?.length) return [];
    const { data: links, error: linksError } = await supabase
      .from("configurator_addon_options")
      .select("addon_id, option_id");
    if (linksError) return addons.map((a) => ({ ...a, option_ids: [] as string[] }));
    const optionIdsByAddon: Record<string, string[]> = {};
    addons.forEach((a) => (optionIdsByAddon[a.id] = []));
    (links as { addon_id: string; option_id: string }[]).forEach(({ addon_id, option_id }) => {
      if (optionIdsByAddon[addon_id]) optionIdsByAddon[addon_id].push(option_id);
    });
    return addons.map((a) => ({ ...a, option_ids: optionIdsByAddon[a.id] ?? [] }));
  } catch {
    return [];
  }
}

export async function getAdminConfiguratorAddons(stepId?: string | null): Promise<ConfiguratorAddonRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  let q = supabase
    .from("configurator_addons")
    .select("id, step_id, label_en, label_fr, price, sort_order")
    .order("sort_order", { ascending: true });
  if (stepId) q = q.eq("step_id", stepId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getConfiguratorAddonOptionIds(addonId: string): Promise<string[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_addon_options")
    .select("option_id")
    .eq("addon_id", addonId);
  if (error) return [];
  return (data ?? []).map((r: { option_id: string }) => r.option_id);
}

export async function createConfiguratorAddon(input: {
  step_id: string;
  label_en: string;
  label_fr?: string;
  price?: number;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.step_id || !input.label_en?.trim()) throw new Error("Step and label required");
  const supabase = createServerClient();
  const { data: inserted, error } = await supabase
    .from("configurator_addons")
    .insert({
      step_id: input.step_id,
      label_en: input.label_en.trim(),
      label_fr: input.label_fr?.trim() || input.label_en.trim(),
      price: Number(input.price) ?? 0,
      sort_order: input.sort_order ?? 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
  return inserted?.id;
}

export async function updateConfiguratorAddon(
  id: string,
  input: { label_en?: string; label_fr?: string; price?: number; sort_order?: number }
) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en;
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr;
  if (input.price !== undefined) updates.price = input.price;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("configurator_addons").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function deleteConfiguratorAddon(id: string) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_addons").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function setConfiguratorAddonOptions(addonId: string, optionIds: string[]) {
  await requireAdmin();
  if (!addonId) throw new Error("Invalid addon id");
  const supabase = createServerClient();
  const { error: delError } = await supabase.from("configurator_addon_options").delete().eq("addon_id", addonId);
  if (delError) throw delError;
  if (optionIds.length > 0) {
    const rows = optionIds.map((option_id) => ({ addon_id: addonId, option_id }));
    const { error: insError } = await supabase.from("configurator_addon_options").insert(rows);
    if (insError) throw insError;
  }
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Admin: get layer transforms (position/scale) for a watch type (function option). */
export async function getLayerTransformsForFunction(
  functionOptionId: string
): Promise<LayerTransformRow[]> {
  await requireAdmin();
  if (!functionOptionId) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("configurator_layer_transforms")
    .select("step_id, option_id, offset_x, offset_y, scale")
    .eq("function_option_id", functionOptionId);
  if (error) return [];
  const stepIds = (data ?? []).map((r: { step_id: string }) => r.step_id);
  if (stepIds.length === 0) return [];
  const { data: steps } = await supabase
    .from("configurator_steps")
    .select("id, step_key")
    .in("id", stepIds);
  const idToKey = new Map(
    (steps ?? []).map((s: { id: string; step_key: string | null }) => [s.id, (s.step_key ?? "").toString()])
  );
  return (data ?? []).map((r: { step_id: string; option_id?: string | null; offset_x: number; offset_y: number; scale: number }) => ({
    step_key: idToKey.get(r.step_id) ?? "",
    option_id: (r as { option_id?: string | null }).option_id ?? null,
    offset_x: Number(r.offset_x ?? 0),
    offset_y: Number(r.offset_y ?? 0),
    scale: Number(r.scale ?? 1),
  }));
}

/** Admin: set layer transforms for a watch type. Transforms keyed by step_id. */
export async function setLayerTransforms(
  functionOptionId: string,
  transforms: { step_id: string; option_id?: string | null; offset_x: number; offset_y: number; scale: number }[]
): Promise<void> {
  await requireAdmin();
  if (!functionOptionId) throw new Error("Function option id required");
  const supabase = createServerClient();
  const { error: delErr } = await supabase
    .from("configurator_layer_transforms")
    .delete()
    .eq("function_option_id", functionOptionId);
  if (delErr) throw delErr;
  if (transforms.length > 0) {
    const rows = transforms.map((t) => ({
      function_option_id: functionOptionId,
      step_id: t.step_id,
      option_id: (t as { option_id?: string | null }).option_id ?? null,
      offset_x: t.offset_x,
      offset_y: t.offset_y,
      scale: Math.max(0.5, Math.min(2, t.scale)),
    }));
    const { error: insErr } = await supabase.from("configurator_layer_transforms").insert(rows);
    if (insErr) throw insErr;
  }
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Admin: set a single layer transform for one step. Use to save only the moved layer. */
export async function setLayerTransformForStep(
  functionOptionId: string,
  stepId: string,
  optionId: string | null,
  offset_x: number,
  offset_y: number,
  scale: number
): Promise<void> {
  await requireAdmin();
  if (!functionOptionId || !stepId) throw new Error("Function option id and step id required");
  const supabase = createServerClient();
  const scaleClamped = Math.max(0.5, Math.min(2, scale));
  // Delete then insert: partial unique indexes don't match ON CONFLICT in Supabase/Postgres
  const q = supabase
    .from("configurator_layer_transforms")
    .delete()
    .eq("function_option_id", functionOptionId)
    .eq("step_id", stepId);
  const { error: delErr } = optionId == null
    ? await q.is("option_id", null)
    : await q.eq("option_id", optionId);
  if (delErr) throw delErr;
  const { error: insErr } = await supabase.from("configurator_layer_transforms").insert({
    function_option_id: functionOptionId,
    step_id: stepId,
    option_id: optionId,
    offset_x,
    offset_y,
    scale: scaleClamped,
  });
  if (insErr) throw insErr;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

/** Per-step layer transform for configurator preview (admin-set, used on public configurator). */
export type LayerTransformRow = {
  step_key: string;
  option_id: string | null;
  offset_x: number;
  offset_y: number;
  scale: number;
};

/** One dropdown choice under a configurator option (e.g. "Polished" for Case option "Yellow Gold"). */
export type PublicDropdownItem = { id: string; label_en: string; label_fr: string; price: number; sort_order: number; image_url: string | null };

/** Public: one option group for customer dropdown (name + image). */
export type PublicOptionGroup = { id: string; step_id: string; label_en: string; label_fr: string; image_url: string | null; sort_order: number };

/** Public: full configurator data for customer (no auth). Used by Configurator component. */
export type PublicConfiguratorData = {
  stepsMeta: { id: string; step_key: string | null; label_en: string; label_fr: string; optional: boolean; sort_order: number; image_url: string | null }[];
  functionOptions: { id: string; label_en: string; label_fr: string; letter: string; price: number; discount_percent: number }[];
  functionStepsMap: Record<string, string[]>;
  options: { id: string; step_id: string; parent_option_id: string | null; label_en: string; label_fr: string; letter: string; price: number; discount_percent: number; image_url: string | null; preview_image_url: string | null; layer_image_url: string | null; layer_z_index: number; option_group_en: string | null; option_group_fr: string | null; group_id: string | null; dropdownItems?: PublicDropdownItem[] }[];
  optionGroups: PublicOptionGroup[];
  addons: { id: string; step_id: string; label_en: string; label_fr: string; price: number; option_ids: string[] }[];
  configuratorDiscountPercent: number;
  /** Layer position/scale per function (watch type). Key = function_option_id, value = per step_key. */
  layerTransformsByFunction: Record<string, LayerTransformRow[]>;
};

export async function getPublicConfiguratorData(): Promise<PublicConfiguratorData | null> {
  try {
    const supabase = createServerClient();

    const { data: stepsRows, error: stepsErr } = await supabase
      .from("configurator_steps")
      .select("id, step_key, label_en, label_fr, optional, sort_order, image_url")
      .order("sort_order", { ascending: true });
    if (stepsErr || !stepsRows?.length) return null;

    const stepsMeta = stepsRows.map((s) => ({
      id: s.id,
      step_key: (s as { step_key?: string }).step_key ?? null,
      label_en: s.label_en,
      label_fr: s.label_fr,
      optional: (s as { optional?: boolean }).optional ?? false,
      sort_order: s.sort_order ?? 0,
      image_url: (s as { image_url?: string }).image_url ?? null,
    }));

    const functionStep = stepsMeta.find((s) => s.step_key === "function");
    if (!functionStep) return null;

    const baseSelect = "id, step_id, parent_option_id, label_en, label_fr, letter, price, discount_percent, image_url, preview_image_url, layer_image_url, layer_z_index";
    let allOptions: (Record<string, unknown> & { id: string; step_id: string; label_en: string; label_fr: string })[] | null = null;
    const { data: optionsWithGroups, error: optErrWithGroups } = await supabase
      .from("configurator_options")
      .select(`${baseSelect}, option_group_en, option_group_fr, group_id`)
      .order("sort_order", { ascending: true });
    if (!optErrWithGroups && optionsWithGroups != null) {
      allOptions = optionsWithGroups as (Record<string, unknown> & { id: string; step_id: string; label_en: string; label_fr: string })[];
    }
    if (allOptions == null) {
      const { data: optionsBase, error: optErr } = await supabase
        .from("configurator_options")
        .select(baseSelect)
        .order("sort_order", { ascending: true });
      if (optErr) return null;
      allOptions = (optionsBase ?? []).map((o) => ({ ...o, option_group_en: null, option_group_fr: null, group_id: null })) as (Record<string, unknown> & { id: string; step_id: string; label_en: string; label_fr: string })[];
    }

    const functionOptions = (allOptions ?? []).filter(
      (o) => o.step_id === functionStep.id && (o as { parent_option_id?: string }).parent_option_id == null
    ).map((o) => ({
      id: o.id,
      label_en: o.label_en,
      label_fr: o.label_fr,
      letter: (o as { letter?: string }).letter ?? "A",
      price: Number((o as { price?: number }).price ?? 0),
      discount_percent: Number((o as { discount_percent?: number }).discount_percent ?? 0),
    }));

    const mapToPublicOptions = (opts: typeof allOptions): PublicConfiguratorData["options"] =>
      (opts ?? []).map((o) => ({
        id: o.id,
        step_id: o.step_id,
        parent_option_id: (o as { parent_option_id?: string }).parent_option_id ?? null,
        label_en: o.label_en,
        label_fr: o.label_fr,
        letter: (o as { letter?: string }).letter ?? "A",
        price: Number((o as { price?: number }).price ?? 0),
        discount_percent: Number((o as { discount_percent?: number }).discount_percent ?? 0),
        image_url: (o as { image_url?: string }).image_url ?? null,
        preview_image_url: (o as { preview_image_url?: string }).preview_image_url ?? null,
        layer_image_url: (o as { layer_image_url?: string }).layer_image_url ?? null,
        layer_z_index: Number((o as { layer_z_index?: number }).layer_z_index ?? 0),
        option_group_en: (o as { option_group_en?: string | null }).option_group_en ?? null,
        option_group_fr: (o as { option_group_fr?: string | null }).option_group_fr ?? null,
        group_id: (o as { group_id?: string | null }).group_id ?? null,
      }));

    const { data: fsRows, error: fsErr } = await supabase
      .from("configurator_function_steps")
      .select("function_option_id, step_id, sort_order")
      .order("sort_order", { ascending: true });
    if (fsErr) return { stepsMeta, functionOptions, functionStepsMap: {}, options: mapToPublicOptions(allOptions), optionGroups: [], addons: [], configuratorDiscountPercent: 0, layerTransformsByFunction: {} };

    const functionStepsMap: Record<string, string[]> = {};
    (fsRows ?? []).forEach((r: { function_option_id: string; step_id: string }) => {
      if (!functionStepsMap[r.function_option_id]) functionStepsMap[r.function_option_id] = [];
      functionStepsMap[r.function_option_id].push(r.step_id);
    });

    const { data: addonsRows, error: addonsErr } = await supabase
      .from("configurator_addons")
      .select("id, step_id, label_en, label_fr, price");
    if (addonsErr) return { stepsMeta, functionOptions, functionStepsMap, options: mapToPublicOptions(allOptions), optionGroups: [], addons: [], configuratorDiscountPercent: 0, layerTransformsByFunction: {} };

    const { data: addonOptRows } = await supabase.from("configurator_addon_options").select("addon_id, option_id");
    const optionIdsByAddon: Record<string, string[]> = {};
    (addonsRows ?? []).forEach((a: { id: string }) => (optionIdsByAddon[a.id] = []));
    (addonOptRows ?? []).forEach((r: { addon_id: string; option_id: string }) => {
      if (optionIdsByAddon[r.addon_id]) optionIdsByAddon[r.addon_id].push(r.option_id);
    });

    const addons = (addonsRows ?? []).map((a: { id: string; step_id: string; label_en: string; label_fr: string; price: number }) => ({
      id: a.id,
      step_id: a.step_id,
      label_en: a.label_en,
      label_fr: a.label_fr,
      price: Number(a.price ?? 0),
      option_ids: optionIdsByAddon[a.id] ?? [],
    }));

    const { data: dropdownRows } = await supabase
      .from("configurator_dropdown_items")
      .select("id, option_id, label_en, label_fr, price, sort_order, image_url")
      .order("sort_order", { ascending: true });
    const dropdownByOptionId: Record<string, PublicDropdownItem[]> = {};
    (dropdownRows ?? []).forEach((d: { id: string; option_id: string; label_en: string; label_fr: string; price: number; sort_order: number; image_url?: string | null }) => {
      if (!dropdownByOptionId[d.option_id]) dropdownByOptionId[d.option_id] = [];
      dropdownByOptionId[d.option_id].push({
        id: d.id,
        label_en: d.label_en,
        label_fr: d.label_fr,
        price: Number(d.price ?? 0),
        sort_order: Number(d.sort_order ?? 0),
        image_url: d.image_url ?? null,
      });
    });

    let optionGroups: PublicOptionGroup[] = [];
    try {
      const { data: groupsRows } = await supabase
        .from("configurator_option_groups")
        .select("id, step_id, label_en, label_fr, image_url, sort_order")
        .order("sort_order", { ascending: true });
      if (groupsRows?.length) {
        optionGroups = groupsRows.map((g: { id: string; step_id: string; label_en: string; label_fr: string; image_url?: string | null; sort_order: number }) => ({
          id: g.id,
          step_id: g.step_id,
          label_en: g.label_en,
          label_fr: g.label_fr,
          image_url: g.image_url ?? null,
          sort_order: Number(g.sort_order ?? 0),
        }));
      }
    } catch {
      // configurator_option_groups table may not exist before migration
    }

    const options = (allOptions ?? []).map((o) => ({
      id: o.id,
      step_id: o.step_id,
      parent_option_id: (o as { parent_option_id?: string }).parent_option_id ?? null,
      label_en: o.label_en,
      label_fr: o.label_fr,
      letter: (o as { letter?: string }).letter ?? "A",
      price: Number((o as { price?: number }).price ?? 0),
      discount_percent: Number((o as { discount_percent?: number }).discount_percent ?? 0),
      image_url: (o as { image_url?: string }).image_url ?? null,
      preview_image_url: (o as { preview_image_url?: string }).preview_image_url ?? null,
      layer_image_url: (o as { layer_image_url?: string }).layer_image_url ?? null,
      layer_z_index: Number((o as { layer_z_index?: number }).layer_z_index ?? 0),
      option_group_en: (o as { option_group_en?: string | null }).option_group_en ?? null,
      option_group_fr: (o as { option_group_fr?: string | null }).option_group_fr ?? null,
      group_id: (o as { group_id?: string | null }).group_id ?? null,
      dropdownItems: dropdownByOptionId[o.id]?.length ? dropdownByOptionId[o.id] : undefined,
    }));

    const { data: discountRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "configurator_discount_percent")
      .single();
    const configuratorDiscountPercent = Math.min(100, Math.max(0, Number((discountRow as { value?: string } | null)?.value ?? 0)));

    let layerTransformsByFunction: Record<string, LayerTransformRow[]> = {};
    const { data: ltRows, error: ltErr } = await supabase
      .from("configurator_layer_transforms")
      .select("function_option_id, step_id, option_id, offset_x, offset_y, scale");
    if (!ltErr && ltRows?.length) {
      const stepIdToKey = new Map(stepsMeta.map((s) => [s.id, (s.step_key ?? "").toString()]));
      ltRows.forEach((r: { function_option_id: string; step_id: string; option_id?: string | null; offset_x: number; offset_y: number; scale: number }) => {
        const fid = r.function_option_id;
        if (!layerTransformsByFunction[fid]) layerTransformsByFunction[fid] = [];
        layerTransformsByFunction[fid].push({
          step_key: stepIdToKey.get(r.step_id) ?? "",
          option_id: (r as { option_id?: string | null }).option_id ?? null,
          offset_x: Number(r.offset_x ?? 0),
          offset_y: Number(r.offset_y ?? 0),
          scale: Number(r.scale ?? 1),
        });
      });
    }

    return { stepsMeta, functionOptions, functionStepsMap, options, optionGroups, addons, configuratorDiscountPercent, layerTransformsByFunction };
  } catch {
    return null;
  }
}

// ——— Orders (admin: view orders + shipping addresses for labels) ———
export type OrderRow = {
  id: string;
  order_number: string | null;
  configuration_id: string | null;
  user_id: string | null;
  total: number;
  status: string | null;
  summary: string | null;
  stripe_session_id: string | null;
  customer_email: string | null;
  shipping_name: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  created_at: string;
};

export async function getAdminOrders(): Promise<OrderRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const fullSelect = "id, order_number, configuration_id, user_id, total, status, summary, stripe_session_id, customer_email, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, tracking_number, tracking_carrier, tracking_url, created_at";
  const { data, error } = await supabase
    .from("orders")
    .select(fullSelect)
    .order("created_at", { ascending: false });
  if (!error) return (data ?? []) as OrderRow[];
  if (error.code === "PGRST116" || error.message?.includes("column") || error.message?.includes("does not exist")) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("orders")
      .select("id, configuration_id, user_id, total, status, summary, stripe_session_id, created_at")
      .order("created_at", { ascending: false });
    if (fallbackError) return [];
    return (fallback ?? []).map((row) => ({
      ...row,
      order_number: null,
      customer_email: null,
      shipping_name: null,
      shipping_line1: null,
      shipping_line2: null,
      shipping_city: null,
      shipping_state: null,
      shipping_postal_code: null,
      shipping_country: null,
      tracking_number: null,
      tracking_carrier: null,
      tracking_url: null,
    })) as OrderRow[];
  }
  return [];
}

export type OrderStatus = "new" | "shipped" | "completed";

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await requireAdmin();
  if (!orderId) throw new Error("Invalid order id");
  const supabase = createServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/orders", "page");
}

export type OrderTrackingInput = {
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  tracking_url?: string | null;
};

export async function updateOrderTracking(orderId: string, input: OrderTrackingInput): Promise<void> {
  await requireAdmin();
  if (!orderId) throw new Error("Invalid order id");
  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("customer_email, order_number")
    .eq("id", orderId)
    .single();

  const updates: Record<string, string | null> = {};
  if (input.tracking_number !== undefined) updates.tracking_number = input.tracking_number || null;
  if (input.tracking_carrier !== undefined) updates.tracking_carrier = input.tracking_carrier || null;
  if (input.tracking_url !== undefined) updates.tracking_url = input.tracking_url || null;
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  if (error) throw error;

  const customerEmail = (order as { customer_email?: string | null } | null)?.customer_email?.trim();
  const orderNumber = (order as { order_number?: string | null } | null)?.order_number ?? null;
  const trackingNumber = updates.tracking_number ?? input.tracking_number ?? null;
  const trackingCarrier = updates.tracking_carrier ?? input.tracking_carrier ?? null;
  const trackingUrl = updates.tracking_url ?? input.tracking_url ?? null;

  if (customerEmail && (trackingNumber || trackingUrl)) {
    const { sendTrackingEmail } = await import("@/lib/email");
    sendTrackingEmail({
      to: customerEmail,
      orderNumber,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      locale: "en",
    }).catch((e) => {
      console.error("[updateOrderTracking] Failed to send tracking email:", e);
    });
  }

  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/orders", "page");
}

export async function deleteOrder(orderId: string): Promise<void> {
  await requireAdmin();
  if (!orderId) throw new Error("Invalid order id");
  const supabase = createServerClient();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
  revalidatePath("/[locale]/account/admin", "page");
  revalidatePath("/[locale]/account/admin/orders", "page");
}

// ——— Configurator discount (site-wide % off custom builds) ———
const CONFIGURATOR_DISCOUNT_KEY = "configurator_discount_percent";

export async function getConfiguratorDiscount(): Promise<number> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", CONFIGURATOR_DISCOUNT_KEY).single();
  const val = (data as { value?: string } | null)?.value;
  return Math.min(100, Math.max(0, Number(val ?? 0)));
}

export async function setConfiguratorDiscount(percent: number): Promise<void> {
  await requireAdmin();
  const p = Math.min(100, Math.max(0, Number(percent)));
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert({ key: CONFIGURATOR_DISCOUNT_KEY, value: String(p), updated_at: new Date().toISOString() }, { onConflict: "key" });
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin/configurator", "page");
}

// ——— Configurator free shipping (site-wide for custom builds) ———
const CONFIGURATOR_FREE_SHIPPING_KEY = "configurator_free_shipping";

export async function getConfiguratorFreeShipping(): Promise<boolean> {
  await requireAdmin();
  const supabase = createServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", CONFIGURATOR_FREE_SHIPPING_KEY).single();
  const val = (data as { value?: string } | null)?.value;
  return val === "true" || val === "1";
}

export async function setConfiguratorFreeShipping(enabled: boolean): Promise<void> {
  await requireAdmin();
  const supabase = createServerClient();
  await supabase.from("site_settings").upsert({ key: CONFIGURATOR_FREE_SHIPPING_KEY, value: enabled ? "true" : "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin/configurator", "page");
}
