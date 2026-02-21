import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color = '#64748b' }) => {
  const chartData = data.map((val, idx) => ({ i: idx, val }));
  
  // Determine color based on trend (last vs first)
  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = isUp ? '#10b981' : '#f43f5e'; // Emerald or Rose

  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
          <Line 
            type="monotone" 
            dataKey="val" 
            stroke={strokeColor} 
            strokeWidth={2} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};