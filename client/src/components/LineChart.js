import React, { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

const calculateTrendLine = (data) => {
  const filteredData = data.filter(point => point.y != null);

  const n = filteredData.length;
  if (n === 0) return [];

  const xValues = filteredData.map((_, index) => index);
  const yValues = filteredData.map(point => point.y);

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return data.map((point, index) => ({
    x: index,
    y: point.y != null ? m * index + b : null,
  }));
};

const LineChart = ({ data, yAxisLabel }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) { // Ensure the canvas is available
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) {
        console.error("Canvas context not found.");
        return; // Exit early if there's no context available
      }

      const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [
          hrs.toString().padStart(2, '0'),
          mins.toString().padStart(2, '0'),
          secs.toString().padStart(2, '0'),
        ].join(':');
      };

      // Check if a chart instance already exists, if so destroy it
      if (chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }

      const trendLineData = calculateTrendLine(data);

      const chartInstance = new Chart(ctx, {
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
              pointStyle: false,
              fill: false,
              tooltip: false,
              spanGaps: true,
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
                label: function (context) {
                  const seconds = context.raw.y;
                  return `Total Time: ${formatTime(seconds)}`;
                },
                title: function (context) {
                  return `Date: ${context[0].label}`;
                },
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
              title: {
                display: true,
                text: yAxisLabel,
              },
              ticks: {
                callback: (value) => {
                  const hours = Math.floor(value / 3600);
                  const minutes = Math.floor((value % 3600) / 60);
                  const seconds = value % 60;
                  return `${hours}:${minutes}:${seconds}`;
                },
              },
            },
          },
        },
      });

      chartRef.current.chartInstance = chartInstance;

      // Cleanup function to destroy the chart on unmount or when data changes
      return () => {
        if (chartRef.current.chartInstance) {
          chartRef.current.chartInstance.destroy();
        }
      };
    } else {
      console.error("Canvas element is not yet available.");
    }
  }, [data, yAxisLabel]); // Re-run effect when data or yAxisLabel changes

  return <canvas ref={chartRef} />;
};

export default LineChart;
