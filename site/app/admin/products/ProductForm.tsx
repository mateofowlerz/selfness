"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addProduct } from "./actions";

export default function ProductForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      const result = await addProduct(formData);
      if (result.success) {
        formRef.current?.reset();
        setImagePreview(null);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-4 p-5 rounded-xl bg-white border border-black/5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          placeholder="Product name"
          className="px-3 py-2.5 rounded-lg border border-black/10 bg-transparent text-base transition-colors duration-150 ease-out focus:outline-none focus:border-primary placeholder:text-(--muted)"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          URL
        </label>
        <input
          type="url"
          id="url"
          name="url"
          required
          placeholder="https://..."
          className="px-3 py-2.5 rounded-lg border border-black/10 bg-transparent text-base transition-colors duration-150 ease-out focus:outline-none focus:border-primary placeholder:text-(--muted)"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Why do you love this?"
          className="px-3 py-2.5 rounded-lg border border-black/10 bg-transparent text-base transition-colors duration-150 ease-out focus:outline-none focus:border-primary placeholder:text-(--muted) resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium">
          Cover Image
        </label>
        <div className="flex items-start gap-4">
          <label
            htmlFor="image"
            className="flex-1 flex items-center justify-center px-4 py-8 rounded-lg border border-dashed border-black/15 cursor-pointer transition-colors duration-150 ease-out hover:border-primary hover:bg-primary/5"
          >
            <span className="text-sm text-(--muted)">{imagePreview ? "Change image" : "Click to upload"}</span>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </label>
          {imagePreview && (
            <div className="w-24 h-18 rounded-lg overflow-hidden bg-black/5 shrink-0">
              <Image
                src={imagePreview}
                alt="Preview"
                width={96}
                height={72}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 px-4 py-3 rounded-lg bg-primary text-white font-medium transition-all duration-150 ease-out md:hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Adding..." : "Add Product"}
      </button>
    </form>
  );
}
