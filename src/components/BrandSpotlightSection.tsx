import { useEffect, useState } from "react";
import type { SpotlightBrand } from "../types";
import { brandsApi } from "../lib/api";
import ProductImage from "./ProductImage";

interface BrandSpotlightSectionProps {
  onOpenProduct: (id: string) => void;
}

export default function BrandSpotlightSection({
  onOpenProduct,
}: BrandSpotlightSectionProps) {
  const [brands, setBrands] = useState<SpotlightBrand[]>([]);

  useEffect(() => {
    brandsApi
      .spotlight()
      .then(({ brands }) => setBrands(brands))
      .catch(() => setBrands([]));
  }, []);

  if (brands.length === 0) return null;

  return (
    <>
      <div className="section-heading-row">
        <h3>Brand Baru ✨</h3>
        <span className="link-btn muted-label">Baru gabung di AURA</span>
      </div>
      <section className="brand-spotlight-row">
        {brands.map((brand) => (
          <div key={brand.id} className="brand-card">
            <div className="brand-card-header">
              <span className="badge badge-umkm">Baru</span>
              <span className="option-row-title">{brand.name}</span>
            </div>
            {brand.tagline && <p className="brand-card-tagline">{brand.tagline}</p>}
            <div className="brand-card-products">
              {brand.products.slice(0, 3).map((product) => (
                <button
                  key={product.id}
                  className="brand-card-product"
                  onClick={() => onOpenProduct(product.id)}
                  title={product.name}
                >
                  <ProductImage
                    color={product.color}
                    label={product.name}
                    aspect="1 / 1"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
