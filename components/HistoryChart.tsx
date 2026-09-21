
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HistoryEntry } from '../types';

interface HistoryChartProps {
  data: HistoryEntry[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</p>
        <p className="text-sm text-teal-600 dark:text-teal-400">
          Score : <span className="font-bold">{payload[0].value}%</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{payload[0].payload.title}</p>
      </div>
    );
  }
  return null;
};

export const HistoryChart: React.FC<HistoryChartProps> = ({ data = [] }) => {
  // Chart needs chronological order (Oldest -> Newest)
  const chartData = [...(data || [])].reverse().map(entry => {
      const date = new Date(entry.date);
      return {
          ...entry,
          displayDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          fullDate: date.toLocaleString('fr-FR'),
      };
  });

  if (chartData.length < 2) return null;

  return (
    <div className="h-64 w-full mb-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Évolution de la conformité</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
            data={chartData}
            margin={{
                top: 10,
                right: 10,
                left: -25,
                bottom: 0,
            }}
            >
            <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
            />
            <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                tickLine={false}
                axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#0d9488" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                activeDot={{ r: 6, strokeWidth: 0 }}
            />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
