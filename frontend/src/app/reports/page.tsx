'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Toast } from '@/components/Toast'
import { CommandPalette } from '@/components/CommandPalette'
import { useApp, AppProvider } from '@/lib/store'
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal'
import { DiskChart } from '@/components/DiskChart'

function ReportsContent() {
  const { requests = [] } = useApp()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const totalRequests = requests.length
  const pendingReview = requests.filter((r: any) => ['pending', 'reviewing', 'draft'].includes(r.status?.toLowerCase())).length
  const approved = requests.filter((r: any) => r.status?.toLowerCase() === 'approved').length
  const totalValue = requests.reduce((sum: number, r: any) => sum + (r.estimatedCost || 0), 0)

  // Chart data
  const velocityData = [
    { week: 'W1', approved: 4, pending: 2, draft: 1 },
    { week: 'W2', approved: 6, pending: 3, draft: 2 },
    { week: 'W3', approved: 3, pending: 5, draft: 1 },
    { week: 'W4', approved: 8, pending: 2, draft: 0 },
    { week: 'W5', approved: 5, pending: 4, draft: 2 },
    { week: 'W6', approved: 7, pending: 3, draft: 1 },
    { week: 'W7', approved: 4, pending: 6, draft: 3 },
    { week: 'W8', approved: 9, pending: 1, draft: 0 },
  ]

  const maxTotal = Math.max(...velocityData.map(d => d.approved + d.pending + d.draft))

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Header />
      <ProfileSettingsModal />
      <Toast />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center mb-4">
            ← Back to requests
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Reports</h1>
          <p className="text-sm text-[#464555] mt-1">Analytics and performance metrics.</p>
          <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4f46e5]">analytics</span>
            Reports & Analytics
          </h1>
          <p className="text-sm text-[#464555] mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">lightbulb</span>
            A high-level view of your team's velocity and request volume over time.
            A high-level view of your team&apos;s velocity and request volume over time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-medium text-[#464555] mb-1">Total Requests</h3>
            <p className="text-3xl font-bold text-[#0b1c30]">{totalRequests}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-medium text-[#464555] mb-1">Pending Review</h3>
            <p className="text-3xl font-bold text-[#0b1c30]">{pendingReview}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-medium text-[#464555] mb-1">Approved</h3>
            <p className="text-3xl font-bold text-[#0b1c30]">{approved}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-medium text-[#464555] mb-1">Total Value</h3>
            <p className="text-3xl font-bold text-[#0b1c30]">${totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[#0b1c30]">Weekly Velocity & Intake</h3>
              <div className="flex items-center space-x-4 text-sm text-[#464555]">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>Approved</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-400 mr-2"></span>Pending</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-300 mr-2"></span>Draft</div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-2">
            

            <div className="h-64 flex items-end justify-between space-x-2 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] border-dashed w-full" />
                <div className="border-b border-[#e2e8f0] w-full" />
              </div>

              {/* Slope Line SVG */}
              <svg className="absolute inset-0 w-full h-[90%] pointer-events-none z-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline 
                <polyline
                  points={velocityData.map((d, i) => `${((i + 0.5) / velocityData.length) * 100},${100 - (d.approved / maxTotal) * 100}`).join(' ')}
                  fill="none" 
                  stroke="#4f46e5" 
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-sm opacity-80"
                />
                {velocityData.map((d, i) => (
                  <circle 
                    key={i} 
                    cx={`${((i + 0.5) / velocityData.length) * 100}`} 
                    cy={`${100 - (d.approved / maxTotal) * 100}`} 
                    r="1.5" 
                  <circle
                    key={i}
                    cx={`${((i + 0.5) / velocityData.length) * 100}`}
                    cy={`${100 - (d.approved / maxTotal) * 100}`}
                    r="1.5"
                    fill="#ffffff"
                    stroke="#4f46e5"
                    strokeWidth="0.5"
                    className="shadow-sm" 
                    className="shadow-sm"
                  />
                ))}
              </svg>

              {velocityData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                  <div className="w-full flex flex-col justify-end space-y-0.5 h-[90%] pb-2">
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full z-30">
                  {/* Custom HTML Tooltip */}
                  <div className="absolute bottom-[90%] left-1/2 -translate-x-1/2 mb-2 w-32 bg-[#0b1c30] text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-white/10">
                    <div className="font-semibold mb-1 text-center border-b border-white/10 pb-1">{d.week} Breakdown</div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/70 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Draft:</span>
                      <span className="font-medium text-white">{d.draft}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className="text-white/70 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending:</span>
                      <span className="font-medium text-white">{d.pending}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className="text-white/70 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></span> Approved:</span>
                      <span className="font-medium text-white">{d.approved}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-white/10">
                      <span className="text-white/70 font-medium">Total Volume:</span>
                      <span className="font-bold text-[#a5b4fc]">{d.draft + d.pending + d.approved}</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0b1c30] rotate-45 border-r border-b border-white/10" />
                  </div>

                  <div className="w-full flex flex-col justify-end space-y-0.5 h-[90%] pb-2 relative z-10 px-1 sm:px-2 lg:px-6">
                    <div 
                      className="w-full bg-slate-300 rounded-t-sm transition-all duration-300 hover:opacity-80" 
                      className="w-full bg-slate-300 rounded-t-sm transition-all duration-300 group-hover:opacity-80" 
                    <div
                      className="w-full bg-slate-300 rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                      style={{ height: `${(d.draft / maxTotal) * 100}%` }}
                    />
                    <div 
                      className="w-full bg-amber-400 transition-all duration-300 hover:opacity-80" 
                      className="w-full bg-amber-400 transition-all duration-300 group-hover:opacity-80" 
                    <div
                      className="w-full bg-amber-400 transition-all duration-300 group-hover:opacity-80"
                      style={{ height: `${(d.pending / maxTotal) * 100}%` }}
                    />
                    <div 
                      className="w-full bg-indigo-500 rounded-b-sm transition-all duration-300 hover:opacity-80" 
                      className="w-full bg-indigo-500 rounded-b-sm transition-all duration-300 group-hover:bg-[#3525cd]" 
                    <div
                      className="w-full bg-indigo-500 rounded-b-sm transition-all duration-300 group-hover:bg-[#3525cd]"
                      style={{ height: `${(d.approved / maxTotal) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-[#464555] font-medium h-[10%]">
                  <div className="text-xs text-center text-[#464555] font-medium h-[10%] flex items-center justify-center transition-colors group-hover:text-[#0b1c30] group-hover:font-bold">
                    {d.week}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <h3 className="font-semibold text-[#0b1c30] mb-6">Current Status Breakdown</h3>
            <div className="flex justify-center mt-8">
              <DiskChart 
              <DiskChart
                data={[
                  { label: 'Pending Review', value: pendingReview, color: '#f59e0b' },
                  { label: 'Awaiting Client', value: requests.filter((r: any) => r.status === 'awaiting_approval').length, color: '#3b82f6' },
                  { label: 'In Progress', value: requests.filter((r: any) => r.status === 'in_progress').length, color: '#4f46e5' },
                  { label: 'Completed', value: approved, color: '#10b981' }
                ]}
                size={180}
                thickness={30}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <AppProvider>
      <ReportsContent />
    </AppProvider>
  )
}
