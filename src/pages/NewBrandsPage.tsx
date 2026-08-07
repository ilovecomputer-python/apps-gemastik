import { useEffect, useState } from "react";
import type { SpotlightBrand } from "../types";
import { brandsApi } from "../lib/api";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface NewBrandsPageProps {
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onApply: () => void;
}

const formatJoinDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function NewBrandsPage({
  onBack,
  onOpenProduct,
  onApply,
}: NewBrandsPageProps) {
  const [brands, setBrands] = useState<SpotlightBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    brandsApi
      .spotlight()
      .then(({ brands }) => setBrands(brands))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <TopBar title="Brand Baru" onBack={onBack} />

      <div className="admin-intro">
        <p>
          Brand UMKM yang baru bergabung belum punya riwayat penjualan atau
          ulasan, jadi jarang muncul di urutan populer. Di sini mereka
          ditonjolkan supaya dapat eksposur dan ulasan pertama.
        </p>
      </div>

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : brands.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="store" size={28} />
          </span>
          <h3>Belum ada brand baru</h3>
          <p className="empty-state-text">
            Brand yang baru disetujui akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="admin-list">
          {brands.map((brand) => (
            <div key={brand.id} className="admin-card">
              <div className="admin-card-head">
                <div>
                  <div className="option-row-title">{brand.name}</div>
                  <div className="meta">
                    ★ {brand.rating.toFixed(1)}
                    {brand.launchDate &&
                      ` · Gabung ${formatJoinDate(brand.launchDate)}`}
                  </div>
                </div>
                <span className="badge badge-umkm">Baru</span>
              </div>

              {brand.tagline && <p className="admin-tagline">{brand.tagline}</p>}
              {brand.story && <p className="condition-advice">{brand.story}</p>}

              {brand.products.length > 0 && (
                <div className="brand-card-products">
                  {brand.products.map((product) => (
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
              )}
            </div>
          ))}
        </div>
      )}

      <button className="brand-apply-banner" onClick={onApply}>
        <Icon name="store" size={22} />
        <div>
          <div className="upgrade-title">Punya brand kecantikan sendiri?</div>
          <p className="upgrade-copy">
            Daftarkan brand UMKM-mu dan mulai jualan di AURA
          </p>
        </div>
      </button>
    </div>
  );
}
