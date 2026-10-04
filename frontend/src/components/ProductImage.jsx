import React, { useState } from 'react';
import { getProductImage } from '../utils/productImages.js';

/**
 * Reusable, normalized ProductImage component for Kinesis Sports Club.
 * Enforces:
 * - Proper aspect ratios and normalized dimensions across all cards
 * - Object-fit contain with subtle padding
 * - Graceful fallback on broken network loads
 * - Zero empty containers or stretched dimensions
 */
export default function ProductImage({
  product,
  alt,
  className = '',
  style = {},
  containerStyle = {},
  fallbackCategory
}) {
  const [hasError, setHasError] = useState(false);
  const initialSrc = getProductImage(product || { category: fallbackCategory });

  return (
    <div
      className={`kinesis-product-image-container ${className}`}
      style={{
        width: '100%',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 'var(--radius-md, 8px)',
        backgroundColor: 'var(--bg-main, #f8fafc)',
        border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        position: 'relative',
        ...containerStyle
      }}
    >
      <img
        src={hasError ? getProductImage({ category: fallbackCategory || 'Gear' }) : initialSrc}
        alt={alt || product?.name || 'Product'}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: '0.6rem',
          transition: 'transform 0.25s ease',
          ...style
        }}
      />
    </div>
  );
}
