import React, { useRef, useEffect, forwardRef } from 'react';
import { Chart } from 'chart.js/auto';

const calculateTrendLine = (data) => {
  const filteredData = data.filter(point => point.y != null && point.y !== 0);

  const n = filteredData.length;
  if (n === 0) return [];

  const baseDate = new Date(filteredData[0].x).getTime();
  const xValues = filteredData.map(point => (new Date(point.x).getTime() - baseDate) / 1000);
  const yValues = filteredData.map(point => point.y);

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return [];

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  return [
    { x: filteredData[0].x, y: m * xValues[0] + b },
    { x: filteredData[filteredData.length - 1].x, y: m * xValues[xValues.length - 1] + b },
  ];
};

const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return 'Invalid';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  const milliseconds = ((seconds % 1) * 10).toFixed(0);
  return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${milliseconds}`;
};

const isTimeLabel = (label) => label?.toLowerCase().includes('time');

const LineChart = forwardRef(({ data, yAxisLabel }, ref) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const trendLineData = calculateTrendLine(data);
    const isTime = isTimeLabel(yAxisLabel);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: yAxisLabel,
            data: data,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            fill: false,
            spanGaps: true,
          },
          {
            label: 'Trend Line',
            data: trendLineData,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        layout: { padding: 20 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw.y;
                return isTime ? `Time: ${formatTime(val)}` : `Value: ${val.toFixed(2)}`;
              },
              title: (ctx) => `Date: ${ctx[0].label}`,
            },
          },
        },
        scales: {
          x: {
            type: 'category', // ✅ avoid needing a time adapter
            title: {
              display: true,
              text: 'Date',
            },
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 0,
            },
          },         
          y: {
            type: 'linear',
            title: {
              display: true,
              text: yAxisLabel.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (c) => c.toUpperCase()),
            },
            ticks: {
              autoSkip: true,
              callback: (val) => {
                return isTime ? formatTime(val) : val.toFixed(2);
              },
            },
          },
        },
      },
    });

    if (ref) {
      ref.current = chartInstanceRef.current;
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, yAxisLabel]);

  // ⬇️ This render always happens outside the hook
  if (!Array.isArray(data) || data.length === 0) {
    return <div>No chart data available.</div>;
  }

  return <canvas ref={canvasRef} />;
});

export default LineChart;
