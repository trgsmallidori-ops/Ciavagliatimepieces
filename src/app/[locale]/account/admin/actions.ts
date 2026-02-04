"use server";

import { revalidatePath } from "next/cache";
import { createAuthServerClient, createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getWatchCategories as getWatchCategoriesLib } from "@/lib/watch-categories";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type ProductInput = {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  active: boolean;
  category?: string | null;
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
  
  const supabase = createServerClient();
  const { id, ...rest } = input;
  const { error } = await supabase
    .from("products")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
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
    price: input.price,
    image: input.image || "/images/hero-1.svg",
    stock: input.stock ?? 0,
    active: input.active ?? true,
    category: input.category || null,
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
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
  });
  if (error) throw error;
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateWatchCategory(
  id: string,
  input: { slug?: string; label_en?: string; label_fr?: string; sort_order?: number }
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
  const { error } = await supabase.from("watch_categories").update(updates).eq("id", id);
  if (error) throw error;
  if (oldSlug && newSlug && oldSlug !== newSlug) {
    await supabase.from("products").update({ category: newSlug }).eq("category", oldSlug);
  }
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[category]", "page");
  revalidatePath("/[locale]/account/admin", "page");
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

// ——— Configurator (steps + options with images) ———
export type ConfiguratorStepRow = { id: string; label_en: string; label_fr: string; sort_order: number };
export type ConfiguratorOptionRow = {
  id: string;
  step_id: string;
  parent_option_id: string | null;
  label_en: string;
  label_fr: string;
  letter: string;
  price: number;
  image_url: string | null;
  preview_image_url: string | null;
  sort_order: number;
};

/** Public: fetch steps in order. */
export async function getConfiguratorSteps(): Promise<ConfiguratorStepRow[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("configurator_steps")
      .select("id, label_en, label_fr, sort_order")
      .order("sort_order", { ascending: true });
    if (error) return [];
    return data ?? [];
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
      .select("id, step_id, parent_option_id, label_en, label_fr, letter, price, image_url, preview_image_url, sort_order")
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
    .select("id, label_en, label_fr, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminConfiguratorOptions(stepId?: string | null, parentOptionId?: string | null): Promise<ConfiguratorOptionRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  let q = supabase
    .from("configurator_options")
    .select("id, step_id, parent_option_id, label_en, label_fr, letter, price, image_url, preview_image_url, sort_order")
    .order("sort_order", { ascending: true });
  if (stepId) q = q.eq("step_id", stepId);
  if (parentOptionId === null) q = q.is("parent_option_id", null);
  else if (parentOptionId != null) q = q.eq("parent_option_id", parentOptionId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createConfiguratorStep(input: { label_en: string; label_fr: string; sort_order?: number }) {
  await requireAdmin();
  if (!input.label_en?.trim()) throw new Error("Label required");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_steps").insert({
    label_en: input.label_en.trim(),
    label_fr: input.label_fr?.trim() || input.label_en.trim(),
    sort_order: input.sort_order ?? 0,
  });
  if (error) throw error;
  revalidatePath("/[locale]/configurator", "page");
  revalidatePath("/[locale]/account/admin", "page");
}

export async function updateConfiguratorStep(id: string, input: { label_en?: string; label_fr?: string; sort_order?: number }) {
  await requireAdmin();
  if (!id) throw new Error("Invalid id");
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.label_en !== undefined) updates.label_en = input.label_en;
  if (input.label_fr !== undefined) updates.label_fr = input.label_fr;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
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
  image_url?: string | null;
  preview_image_url?: string | null;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.step_id || !input.label_en?.trim()) throw new Error("Step and label required");
  const supabase = createServerClient();
  const { error } = await supabase.from("configurator_options").insert({
    step_id: input.step_id,
    parent_option_id: input.parent_option_id ?? null,
    label_en: input.label_en.trim(),
    label_fr: (input.label_fr ?? input.label_en).trim(),
    letter: (input.letter || "A").slice(0, 1),
    price: Number(input.price) ?? 0,
    image_url: input.image_url ?? null,
    preview_image_url: input.preview_image_url ?? null,
    sort_order: input.sort_order ?? 0,
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
    image_url?: string | null;
    preview_image_url?: string | null;
    sort_order?: number;
    parent_option_id?: string | null;
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
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.preview_image_url !== undefined) updates.preview_image_url = input.preview_image_url;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.parent_option_id !== undefined) updates.parent_option_id = input.parent_option_id;
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

// ——— Orders (admin: view orders + shipping addresses for labels) ———
export type OrderRow = {
  id: string;
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
  created_at: string;
};

export async function getAdminOrders(): Promise<OrderRow[]> {
  await requireAdmin();
  const supabase = createServerClient();
  const fullSelect = "id, configuration_id, user_id, total, status, summary, stripe_session_id, customer_email, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, created_at";
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
      customer_email: null,
      shipping_name: null,
      shipping_line1: null,
      shipping_line2: null,
      shipping_city: null,
      shipping_state: null,
      shipping_postal_code: null,
      shipping_country: null,
    })) as OrderRow[];
  }
  return [];
}
