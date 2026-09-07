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
      <Toast />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center mb-4">
            ← Back to requests
          </Link>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Reports</h1>
          <p className="text-sm text-[#464555] mt-1">Analytics and performance metrics.</p>
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

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[#0b1c30]">Weekly Velocity & Intake</h3>
              <div className="flex items-center space-x-4 text-sm text-[#464555]">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>Approved</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-400 mr-2"></span>Pending</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-300 mr-2"></span>Draft</div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-2">
              {velocityData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                  <div className="w-full flex flex-col justify-end space-y-0.5 h-[90%] pb-2">
                    <div 
                      className="w-full bg-slate-300 rounded-t-sm transition-all duration-300 hover:opacity-80" 
                      style={{ height: `${(d.draft / maxTotal) * 100}%` }}
                    />
                    <div 
                      className="w-full bg-amber-400 transition-all duration-300 hover:opacity-80" 
                      style={{ height: `${(d.pending / maxTotal) * 100}%` }}
                    />
                    <div 
                      className="w-full bg-indigo-500 rounded-b-sm transition-all duration-300 hover:opacity-80" 
                      style={{ height: `${(d.approved / maxTotal) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-[#464555] font-medium h-[10%]">
                    {d.week}
                  </div>
                </div>
              ))}
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
