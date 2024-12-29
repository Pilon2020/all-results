import React, { useRef, useEffect } from 'react';
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
  if (denominator === 0) {
    console.error("Cannot compute linear regression: identical x values.");
    return [];
  }

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  const firstPointTime = xValues[0];
  const lastPointTime = xValues[xValues.length - 1];

  const firstPointY = m * firstPointTime + b;
  const lastPointY = m * lastPointTime + b;

  return [
    { x: filteredData[0].x, y: firstPointY },
    { x: filteredData[filteredData.length - 1].x, y: lastPointY },
  ];
};

const formatTime = (seconds) => {
  // Convert seconds to hours, minutes, seconds, and milliseconds
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  const milliseconds = (sec % 1).toFixed(1).slice(2); // Extract milliseconds

  // Use toFixed to ensure two decimal places for seconds and milliseconds
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${Math.floor(sec).toString().padStart(2, '0')}.${milliseconds}`;
};

const LineChart = ({ data, yAxisLabel }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null); // To keep track of the Chart.js instance

  useEffect(() => {
    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;

    const trendLineData = calculateTrendLine(data);

    // Destroy existing chart instance if it exists
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
            hoverBackgroundColor: 'rgba(0,0,0,0)',
            spanGaps: true,
          },
          {
            label: 'Trend Line',
            data: trendLineData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            fill: false,
            spanGaps: true,
            pointRadius: 0,
            hoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        layout: {
          padding: 20,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const seconds = context.raw.y;
                return `Total Time: ${formatTime(seconds)}`;
              },
              title: (context) => `Date: ${context[0].label}`,
            },
          },
        },
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Date',
            },
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: yAxisLabel.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (char) => char.toUpperCase()),
            },
            ticks: {
              callback: (value) => {
                // Use formatTime to display hh:mm:ss.mm format
                return formatTime(value);
              },
            },
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, yAxisLabel]);

  return <canvas ref={chartRef} />;
};

export default LineChart;
