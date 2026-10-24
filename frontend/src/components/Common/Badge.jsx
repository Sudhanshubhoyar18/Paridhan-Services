import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    navy: 'bg-slate-900 text-amber-400 border-slate-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

export function PaymentBadge({ status }) {
  if (status === 'Paid') {
    return <Badge variant="success">Paid</Badge>;
  }
  if (status === 'Partial') {
    return <Badge variant="warning">Partial</Badge>;
  }
  if (status === 'Unpaid') {
    return <Badge variant="danger">Unpaid</Badge>;
  }
  return <Badge variant="default">{status}</Badge>;
}

export default Badge;
