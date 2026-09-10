'use client'

import React from 'react'

export interface NextActionBadgeProps {
  status: string
  className?: string
}

export function NextActionBadge({ status, className = '' }: NextActionBadgeProps) {
  let text = ''
  let icon = ''
  let colorClasses = ''

  switch (status) {
    case 'draft':
      text = 'Submit for developer approval'
      icon = 'edit'
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200'
      break
    case 'pending':
      text = 'Submit for developer approval'
      icon = 'send'
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200'
      break
    case 'reviewing':
      text = 'Waiting for developer approval'
      icon = 'hourglass_top'
      colorClasses = 'bg-violet-50 text-violet-700 border-violet-200'
      break
    case 'awaiting_approval':
      text = 'Waiting for client response'
      icon = 'hourglass_top'
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200'
      break
    case 'approved':
      text = 'Begin work'
      icon = 'play_arrow'
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      break
    case 'in_progress':
      text = 'Complete and deliver'
      icon = 'rate_review'
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200'
      break
    case 'completed':
      text = 'Completed'
      icon = 'check_circle'
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      break
    case 'declined':
      text = 'Review client feedback'
      icon = 'feedback'
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200'
      break
    default:
      text = 'Unknown status'
      icon = 'help'
      colorClasses = 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <div
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium gap-1.5 ${colorClasses} ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span>{text}</span>
    </div>
  )
}
