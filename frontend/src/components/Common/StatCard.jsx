import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'navy', trend }) {
  const colorStyles = {
    navy: 'bg-white text-slate-800 border-slate-200/80 hover:border-slate-300',
    gold: 'bg-white text-slate-800 border-amber-200/80 hover:border-amber-300',
    danger: 'bg-white text-slate-800 border-rose-200/80 hover:border-rose-300',
    emerald: 'bg-white text-slate-800 border-emerald-200/80 hover:border-emerald-300',
  };

  const iconBgStyles = {
    navy: 'bg-slate-900 text-amber-400',
    gold: 'bg-amber-500 text-white',
    danger: 'bg-rose-500 text-white',
    emerald: 'bg-emerald-600 text-white',
  };

  return (
    <div className={`p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${colorStyles[color] || colorStyles.navy}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h4 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl shadow-sm ${iconBgStyles[color] || iconBgStyles.navy}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {trend}
        </div>
      )}
    </div>
  );
}

export default StatCard;
