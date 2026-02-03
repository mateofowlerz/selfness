"use client";

import { useState } from "react";
import { deleteProduct } from "./actions";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: string }) {
	const [isDeleting, setIsDeleting] = useState(false);
	const router = useRouter();

	async function handleDelete() {
		if (!confirm("Delete this product?")) return;

		setIsDeleting(true);
		try {
			await deleteProduct(id);
			router.refresh();
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<button
			onClick={handleDelete}
			disabled={isDeleting}
			className="w-10 h-10 flex items-center justify-center rounded-lg text-(--muted) transition-colors duration-150 ease-out md:hover:text-red-600 md:hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
			aria-label="Delete product"
		>
			{isDeleting ? (
				<svg
					className="w-5 h-5 animate-spin"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
					<path d="M12 2a10 10 0 0 1 10 10" />
				</svg>
			) : (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M3 6h18" />
					<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
					<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
					<line x1="10" y1="11" x2="10" y2="17" />
					<line x1="14" y1="11" x2="14" y2="17" />
				</svg>
			)}
		</button>
	);
}
