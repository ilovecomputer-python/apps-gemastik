interface ProductImageProps {
  color: string;
  label: string;
  aspect?: string;
}

export default function ProductImage({
  color,
  label,
  aspect = "1 / 1",
}: ProductImageProps) {
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="product-image"
      style={{
        aspectRatio: aspect,
        background: `linear-gradient(160deg, ${color}, ${color}cc)`,
      }}
    >
      <span>{initials}</span>
    </div>
  );
}
