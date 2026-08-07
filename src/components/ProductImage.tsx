import { useState } from "react";

interface ProductImageProps {
  color: string;
  label: string;
  aspect?: string;
  imageUrl?: string | null;
}

export default function ProductImage({
  color,
  label,
  aspect = "1 / 1",
  imageUrl,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(imageUrl) && !failed;

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
        background: showPhoto
          ? undefined
          : `linear-gradient(160deg, ${color}, ${color}cc)`,
      }}
    >
      {showPhoto ? (
        <img
          src={imageUrl!}
          alt={label}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
