// Shared chart.js styling for admin charts (brand orange / ink / greys).
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler, BarController, LineController,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler, BarController, LineController);

export const BRAND = '#f37021';
export const BRAND_LIGHT = '#fbad78';
export const INK = '#111114';
export const GREY = '#cbd5e1';

export const tooltipStyle = {
  backgroundColor: INK,
  padding: 10,
  cornerRadius: 10,
  titleFont: { family: 'Outfit, sans-serif', weight: '600' },
  bodyFont: { family: 'Outfit, sans-serif', weight: '700' },
};

export const baseScales = {
  y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { precision: 0, color: '#94a3b8', font: { family: 'Outfit, sans-serif' } } },
  x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Outfit, sans-serif', weight: '600' } } },
};

export const rupeeTick = (v) => {
  const a = Math.abs(v);
  if (a >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (a >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};

// Vertical orange gradient computed against the chart area.
export const brandGradient = (ctx, from = 'rgba(243,112,33,0.95)', to = 'rgba(251,173,120,0.75)') => {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return from;
  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
};
