import type { PersonalizedKit, SkinProfile } from "../types";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import { formatPrice } from "../utils/format";

interface QuizResultPageProps {
  profile: SkinProfile;
  kit: PersonalizedKit;
  onBack: () => void;
  onOpenProduct: (id: string) => void;
}

export default function QuizResultPage({
  profile,
  kit,
  onBack,
  onOpenProduct,
}: QuizResultPageProps) {
  return (
    <div className="screen">
      <TopBar title="Trial Kit Kamu" onBack={onBack} />

      <div className="scan-result">
        <span className="badge badge-default">Dari jawabanmu</span>
        <h2>Kulit {profile.skinTypeLabel}</h2>
        <p className="scan-result-detail">
          {profile.concernLabels.length > 0
            ? `Fokus mengatasi ${profile.concernLabels.join(", ")}. `
            : ""}
          Trial kit di bawah disusun khusus untukmu
          {profile.newBrandOk ? ", termasuk pilihan dari brand baru." : "."}
        </p>
      </div>

      {profile.concernDetails.length > 0 && (
        <div className="checkout-section">
          <h3 className="section-title">Kondisi kulit yang kamu laporkan</h3>
          <div className="condition-list">
            {profile.concernDetails.map((concern) => (
              <div key={concern.key} className="condition-row">
                <div className="condition-head">
                  <span className="condition-label">{concern.label}</span>
                </div>
                <p className="condition-advice">{concern.advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="checkout-section">
        <div className="trial-kit-list">
          <div className="trial-kit-card">
            <div className="trial-kit-items">
              {kit.items.map((item) => (
                <button
                  key={item.id}
                  className="quiz-kit-item"
                  onClick={() => onOpenProduct(item.product.id)}
                >
                  <ProductImage
                    color={item.product.color}
                    label={item.product.name}
                    aspect="1 / 1"
                    imageUrl={item.product.imageUrl}
                  />
                  <div className="cart-item-body">
                    <span className="brand">{item.product.brand}</span>
                    <div className="name">{item.product.name}</div>
                    <span className="meta">{item.reason}</span>
                    <span className="price">
                      {formatPrice(item.product.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
