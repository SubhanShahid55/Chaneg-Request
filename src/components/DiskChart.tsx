import React from 'react';

interface DiskChartItem {
  label: string;
  value: number;
  color: string;
}

interface DiskChartProps {
  data: DiskChartItem[];
  title?: string;
  size?: number;
  thickness?: number;
}

export function DiskChart({ data, title, size = 120, thickness = 20 }: DiskChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;

  const center = size / 2;
  const radius = center - thickness / 2;

  // Filter out zero values and calculate paths
  const paths = data.filter(item => item.value > 0).map((item, i) => {
    const percent = item.value / (total || 1);
    
    // Start at -90 degrees (top)
    const startX = center + radius * Math.cos(2 * Math.PI * cumulativePercent - Math.PI / 2);
    const startY = center + radius * Math.sin(2 * Math.PI * cumulativePercent - Math.PI / 2);
    
    cumulativePercent += percent;
    
    const endX = center + radius * Math.cos(2 * Math.PI * cumulativePercent - Math.PI / 2);
    const endY = center + radius * Math.sin(2 * Math.PI * cumulativePercent - Math.PI / 2);

    const largeArcFlag = percent > 0.5 ? 1 : 0;

    // If it's a full circle (100%)
    if (percent === 1) {
      return (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={item.color}
          strokeWidth={thickness}
        />
      );
    }

    const pathData = [
      `M ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    ].join(' ');

    return (
      <path
        key={i}
        d={pathData}
        fill="none"
        stroke={item.color}
        strokeWidth={thickness}
        strokeLinecap="round"
        className="transition-all duration-300 ease-in-out hover:opacity-80"
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
          ) : (
            paths
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-[#0b1c30]">{total}</span>
          <span className="text-[10px] text-[#464555] uppercase tracking-wider">Total</span>
        </div>
      </div>
      
      <div className="flex flex-col justify-center gap-2 flex-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[#464555] font-medium">{item.label}</span>
            </div>
            <span className="font-semibold text-[#0b1c30]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
