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

function severityClass(score: number): string {
  if (score >= 65) return "high";
  if (score >= 30) return "medium";
  return "low";
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
            <span className="option-row-title">{result.undertoneLabel}</span>
            <span className="undertone-depth">Kulit {result.depthLabel}</span>
          </div>
          <p className="condition-advice">{result.undertoneAdvice}</p>
        </div>
      </div>

      {result.warning && (
        <div className="scan-warning">
          <Icon name="sparkle" size={15} />
          <span>{result.warning}</span>
        </div>
      )}

      {result.conditions && result.conditions.length > 0 && (
        <div className="checkout-section">
          <h3 className="section-title">Kondisi kulit terdeteksi</h3>
          <div className="condition-list">
            {result.conditions.map((condition) => (
              <div key={condition.key} className="condition-row">
                <div className="condition-head">
                  <span className="condition-label">{condition.label}</span>
                  <span
                    className={`condition-score ${severityClass(condition.score)}`}
                  >
                    {condition.severity}
                  </span>
                </div>
                <div className="condition-bar">
                  <span
                    className={`condition-fill ${severityClass(condition.score)}`}
                    style={{ width: `${condition.score}%` }}
                  />
                </div>
                {condition.noticeable && (
                  <p className="condition-advice">{condition.advice}</p>
                )}
              </div>
            ))}
          </div>
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
