import React from 'react';

export function StatusBadge({ status }) {
  const styles = {
    'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
    'Assigned': 'bg-purple-50 text-purple-700 border-purple-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Closed': 'bg-slate-100 text-slate-700 border-slate-300',
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Scheduled': 'bg-sky-50 text-sky-700 border-sky-200',
    'Investigating': 'bg-amber-50 text-amber-700 border-amber-200',
    'Clearing': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200',
    'Unpaid': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const currentStyle = styles[status] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {status || 'Unknown'}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const styles = {
    'Urgent': 'bg-red-100 text-red-800 border-red-300 font-bold',
    'High': 'bg-orange-100 text-orange-800 border-orange-300',
    'Medium': 'bg-amber-100 text-amber-800 border-amber-300',
    'Low': 'bg-slate-100 text-slate-700 border-slate-300',
    'Critical': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  };

  const currentStyle = styles[priority] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${currentStyle}`}>
      {priority || 'Normal'}
    </span>
  );
}
