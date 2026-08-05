import { useEffect, useState } from "react";
import type { Product, ScanMode } from "../types";
import { scanApi } from "../lib/api";
import TopBar from "../components/TopBar";
import ProductCard from "../components/ProductCard";

interface ScanResultPageProps {
  mode: ScanMode;
  wishlist: Set<string>;
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}

export default function ScanResultPage({
  mode,
  wishlist,
  onBack,
  onOpenProduct,
  onToggleWishlist,
}: ScanResultPageProps) {
  const [result, setResult] = useState<{
    headline: string;
    detail: string;
    recommendations: Product[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    scanApi
      .analyze(mode)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className="screen">
      <TopBar title="Hasil Analisa" onBack={onBack} />

      {loading || !result ? (
        <p className="loading-text">Menganalisa…</p>
      ) : (
        <>
          <div className="scan-result">
            <span className="badge badge-ai">Hasil AI (contoh)</span>
            <h2>{result.headline}</h2>
            <p className="scan-result-detail">{result.detail}</p>
          </div>

          <div className="section-heading-row">
            <h3>Rekomendasi untukmu</h3>
          </div>
          <section className="grid">
            {result.recommendations.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishlist.has(product.id)}
                onOpen={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
