import Image from "next/image";
import { getWishlistItem } from "../utils";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getWishlistItem(slug);
  console.log(item);

  return (
    <section className="">
      <div className="flex flex-col">
        <Image src={item.image} width={2000} height={2000} alt={item.title} />
        <h1>{item.title}</h1>
      </div>
    </section>
  );
}
