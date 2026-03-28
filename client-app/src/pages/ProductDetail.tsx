import { useNavigate, useParams } from "react-router-dom";
import { createLead } from "@/api/crm";
import { products } from "@/data/products";
import { useState } from "react";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug) ?? products[0];
  const [message, setMessage] = useState<string>("");

  const handleInterest = async () => {
    await createLead({
      companyName: "",
      fullName: "",
      email: "",
      phone: "",
      productInterest: product.name,
      source: "product_page",
    });

    setMessage("Interest recorded.");
  };

  return (
    <div className="container py-14 md:py-20">
      <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
      <p className="mb-8 text-lg">{product.description}</p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate(`/products/${product.slug}`)}
          className="bg-brand-accent px-6 py-3 rounded text-white"
        >
          Learn More
        </button>

        <button
          onClick={() => void handleInterest()}
          className="bg-brand-accent px-6 py-3 rounded text-white"
        >
          Speak With Advisor
        </button>
      </div>

      {message && <p role="status">{message}</p>}
    </div>
  );
}
