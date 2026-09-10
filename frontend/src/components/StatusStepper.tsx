'use client';

import React from 'react';

export interface StatusStepperProps {
  currentStatus: string;
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const steps = [
    { label: 'New', mobileLabel: 'New' },
    { label: 'Reviewing', mobileLabel: 'Review' },
    { label: 'Awaiting approval', mobileLabel: 'Awaiting' },
    { label: 'Approved', mobileLabel: 'Approved' },
    { label: 'In progress', mobileLabel: 'In prog.' },
    { label: 'Completed', mobileLabel: 'Done' },
  ];

  let currentStepIndex = 0;
  let isDeclined = false;

  switch (currentStatus) {
    case 'draft': currentStepIndex = 0; break;
    case 'reviewing':
    case 'pending': currentStepIndex = 1; break;
    case 'awaiting_approval': currentStepIndex = 2; break;
    case 'approved': currentStepIndex = 3; break;
    case 'in_progress': currentStepIndex = 4; break;
    case 'completed': currentStepIndex = 5; break;
    case 'declined':
      currentStepIndex = 2;
      isDeclined = true;
      break;
    default: currentStepIndex = 0;
  }

  const currentStepLabel = steps[currentStepIndex]?.label || 'Unknown';

  return (
    <div
      className="w-full flex items-center justify-between relative"
      aria-label={`Progress: ${isDeclined ? 'Declined' : currentStepLabel}`}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex && !isDeclined;
        const isCurrent = index === currentStepIndex && !isDeclined;
        const isDeclinedStep = index === 2 && isDeclined;

        return (
          <div key={index} className="flex flex-col items-center flex-1 relative group z-10">
            {/* Connecting line */}
            {index !== 0 && (
              <div
                className={`absolute top-4 right-[50%] w-full h-[2px] -z-10 ${
                  (index <= currentStepIndex && !isDeclined) || (isDeclined && index <= 2)
                    ? 'bg-[#4f46e5]'
                    : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />
            )}
            
            {/* Step Circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${
                isCompleted
                  ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                  : isCurrent
                  ? 'border-[#4f46e5] ring-4 ring-[#4f46e5]/10 scale-110'
                  : isDeclinedStep
                  ? 'bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100 scale-110'
                  : 'border-gray-300 text-gray-400'
              }`}
            >
              {isCompleted ? (
                <span className="material-symbols-outlined text-[18px] font-bold">check</span>
              ) : isCurrent ? (
                <div className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]" />
              ) : isDeclinedStep ? (
                <span className="material-symbols-outlined text-[18px] font-bold">close</span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>

            {/* Labels */}
            <div className="mt-2 text-center">
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isDeclinedStep
                    ? 'text-rose-600 font-semibold'
                    : isCurrent || isCompleted
                    ? 'text-[#0b1c30]'
                    : 'text-[#777587]'
                }`}
              >
                <span className="hidden sm:inline">{isDeclinedStep ? 'Declined' : step.label}</span>
                <span className="inline sm:hidden">{isDeclinedStep ? 'Declined' : step.mobileLabel}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
