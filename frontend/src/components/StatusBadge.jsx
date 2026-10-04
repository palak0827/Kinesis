import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Info } from 'lucide-react';

/**
 * Standardized Kinesis Status Badge (Section 17)
 * - SUCCESS: ACTIVE, PAID, AVAILABLE, COMPLETED, CHECKED IN
 * - WARNING: PENDING, PREPARING, LOW STOCK
 * - DANGER:  EXPIRED, CANCELLED, OUT OF STOCK, ACCESS DENIED
 * - INFO:    RESERVED, NEW, UPCOMING
 */
export default function StatusBadge({ status, label, className = '', style = {} }) {
  const norm = String(status || '').toUpperCase().trim();
  const displayLabel = label || norm.replace(/_/g, ' ');

  let type = 'neutral';
  let Icon = Info;

  if (['ACTIVE', 'PAID', 'AVAILABLE', 'COMPLETED', 'CHECKED IN', 'PICKED_UP', 'PICKED UP'].includes(norm)) {
    type = 'success';
    Icon = CheckCircle2;
  } else if (['PENDING', 'PREPARING', 'LOW STOCK', 'PENDING_PICKUP', 'READY'].includes(norm)) {
    type = 'warning';
    Icon = Clock;
  } else if (['EXPIRED', 'CANCELLED', 'OUT OF STOCK', 'ACCESS DENIED', 'INACTIVE', 'SUSPENDED'].includes(norm)) {
    type = 'danger';
    Icon = AlertCircle;
  } else if (['RESERVED', 'NEW', 'UPCOMING', 'MAINTENANCE'].includes(norm)) {
    type = 'info';
    Icon = Info;
  }

  return (
    <span
      className={`badge badge-${type} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        ...style
      }}
    >
      <Icon size={12} strokeWidth={2.5} />
      <span>{displayLabel}</span>
    </span>
  );
}
