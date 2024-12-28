import React, { useState, useEffect, useRef } from 'react';
import LineChart from './LineChart';

function AthleteAnalysis({ athlete, groupedResults }) {
  const [yAxisField, setYAxisField] = useState('swimTime'); // Default Y-axis field

  // Helper function to convert time strings to total seconds
  const convertTimeToSeconds = (timeString) => {
    if (!timeString || !timeString.includes(':')) return null; // Handle empty or undefined strings

    const timeParts = timeString.split(':').map(Number);
    return timeParts.reduce((acc, part) => acc * 60 + part, 0);
  };

  const timeFields = ['swimTime', 't1', 'bikeTime', 't2', 'runTime', 'totalTime'];
  
  // Transform results data into a flat array with the necessary fields
  const data = Object.values(groupedResults).flatMap(yearData =>
    Object.values(yearData).flatMap(distanceData =>
      distanceData.map(result => {
        const totalInSeconds = convertTimeToSeconds(result.Total);
        const t1InSeconds = convertTimeToSeconds(result.T1);
        const t2InSeconds = convertTimeToSeconds(result.T2);
        const bikeInSeconds = convertTimeToSeconds(result.Bike);
        const runInSeconds = convertTimeToSeconds(result.Run);
        const swimInSeconds = convertTimeToSeconds(result.Swim);

        return {
          date: result.Date,
          totalTime: totalInSeconds,
          t1: t1InSeconds,
          t2: t2InSeconds,
          bikeTime: bikeInSeconds,
          runTime: runInSeconds,
          swimTime: swimInSeconds,
          name: result.Name,
          race: result.Race,
          distance: result.Distance,
        };
      }).filter(Boolean) // Remove invalid entries
    )
  );

  // Group data by distance
  const groupedByDistance = data.reduce((acc, entry) => {
    if (!acc[entry.distance]) acc[entry.distance] = [];
    acc[entry.distance].push(entry);
    return acc;
  }, {});

  // Transform data for Chart.js
  const getChartData = (distanceData) => {
    return distanceData.map((entry) => ({
      x: entry.date, // Date as X-axis
      y: entry[yAxisField] // Use the specified field for Y-axis
    }));
  };

  // Create an array of refs, one for each distance chart
  const chartRefs = useRef([]);

  useEffect(() => {
    // Cleanup (destroy) each chart instance
    chartRefs.current.forEach((ref) => {
      if (ref && ref.chartInstance) {
        ref.chartInstance.destroy();
      }
    });
  
    // Initialize refs to be the same length as the number of LineChart components
    chartRefs.current = new Array(Object.keys(groupedByDistance).length);
  }, [yAxisField, groupedByDistance]);
  
  return (
    <div style={{ border: '3px solid #ccc', borderTop: 'none', borderRadius: '0px 0px 10px 10px' }}>
      <div style={{ padding: '10px' }} className="body">
        <h2>Analysis</h2>
        <p>{athlete.Name} analysis.</p>
        <h3>{yAxisField} from All Data:</h3>

        {/* Dropdown to select the Y-axis field */}
        <div>
          <select onChange={(e) => setYAxisField(e.target.value)} value={yAxisField}>
            {timeFields.map((field) => (
              <option key={field} value={field}>
                {field.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, char => char.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Render multiple LineCharts for each distance */}
        {Object.keys(groupedByDistance).map((distance, index) => (
          <div key={distance}>
            <h4>{distance} Distance</h4>
            <LineChart
              data={getChartData(groupedByDistance[distance])}
              yAxisLabel={yAxisField}
              ref={(el) => chartRefs.current[index] = el} // Set ref for each chart
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AthleteAnalysis;
