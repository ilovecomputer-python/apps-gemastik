import type { ScanAnalysis } from "../types";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface ScanResultPageProps {
  result: ScanAnalysis;
  onBack: () => void;
  onOpenProduct: (id: string) => void;
}

export default function ScanResultPage({
  result,
  onBack,
  onOpenProduct,
}: ScanResultPageProps) {
  return (
    <div className="screen">
      <TopBar title="Hasil Analisa" onBack={onBack} />

      <div className="scan-result">
        <span className="badge badge-ai">Dianalisa AI</span>
        <h2>{result.headline}</h2>
        <p className="scan-result-detail">{result.detail}</p>

      </div>

      <div className="checkout-section">
        <div className="undertone-card">
          <div className="undertone-head">
            <span className="option-row-title">{result.personalColour.label}</span>
            <span className="undertone-depth">Personal Colour</span>
          </div>
          <p className="condition-advice">{result.personalColour.summary}</p>
          <div className="hashtag-row">
            {result.personalColour.palette.map((colour) => (
              <span key={colour} className="hashtag">{colour}</span>
            ))}
          </div>
          {result.personalColour.avoid.length > 0 && (
            <>
              <span className="undertone-depth">Sebaiknya dihindari</span>
              <div className="hashtag-row">
                {result.personalColour.avoid.map((colour) => (
                  <span key={colour} className="hashtag hashtag-avoid">{colour}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="undertone-card">
          <div className="undertone-head">
            <span className="option-row-title">{result.skinShade.fitzpatrickLabel}</span>
            <span className="undertone-depth">{result.skinShade.undertoneLabel}</span>
          </div>
          <p className="condition-advice">{result.skinShade.undertoneAdvice}</p>
          {result.skinShade.matchedShade && (
            <span className="badge badge-umkm">
              Shade cocok: {result.skinShade.matchedShade}
            </span>
          )}
        </div>
      </div>

      <p className="scan-measurement">
        Diukur dari foto: L*{result.measurement.lab.l} a*{result.measurement.lab.a}{" "}
        b*{result.measurement.lab.b} · ITA° {result.measurement.ita}
      </p>

      {result.warning && (
        <div className="scan-warning">
          <Icon name="sparkle" size={15} />
          <span>{result.warning}</span>
        </div>
      )}

      <div className="checkout-section">
        <h3 className="section-title">Rekomendasi untukmu</h3>
        <div className="trial-kit-items">
          {result.recommendations.map(({ product, reason }) => (
            <button
              key={product.id}
              className="quiz-kit-item"
              onClick={() => onOpenProduct(product.id)}
            >
              <ProductImage
                color={product.color}
                label={product.name}
                aspect="1 / 1"
                imageUrl={product.imageUrl}
              />
              <div className="cart-item-body">
                <span className="brand">{product.brand}</span>
                <div className="name">{product.name}</div>
                <span className="meta">{reason}</span>
                <span className="price">{formatPrice(product.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="scan-disclaimer">{result.disclaimer}</p>
    </div>
  );
}
