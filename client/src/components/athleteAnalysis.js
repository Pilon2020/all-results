import React, { useState, useEffect, useRef } from 'react';
import LineChart from './LineChart';

function AthleteAnalysis({ athlete, groupedResults }) {
  const [yAxisField, setYAxisField] = useState('swimTime'); // Default Y-axis field
  const [displaySpeed, setDisplaySpeed] = useState(false); // Toggle for time/speed

  const convertTimeToSeconds = (timeString) => {
    if (!timeString || !timeString.includes(':')) return null;
    const timeParts = timeString.split(':').map(Number);
    return timeParts.reduce((acc, part) => acc * 60 + part, 0);
  };

  const timeFields = ['swimTime', 't1', 'bikeTime', 't2', 'runTime', 'totalTime'];

  const data = Object.values(groupedResults).flatMap((yearData) =>
    Object.values(yearData).flatMap((distanceData) =>
      distanceData.map((result) => {
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
          swimDistance: result['Swim Distance'] || null,
          bikeDistance: result['Bike Distance'] || null,
          runDistance: result['Run Distance'] || null,
        };
      }).filter(Boolean)
    )
  );

  const groupedByDistance = data.reduce((acc, entry) => {
    if (!acc[entry.distance]) acc[entry.distance] = [];
    acc[entry.distance].push(entry);
    return acc;
  }, {});

  const calculateSpeed = (timeInSeconds, distance, unit) => {
    if (!timeInSeconds || !distance) return null;
    let speed = null;

    if (unit === 'swim') {
      const speedInMetersPerSecond = distance / timeInSeconds;
      const timeFor100Meters = 100 / speedInMetersPerSecond;
      speed = timeFor100Meters;
    } else if (unit === 'bike') {
      speed = (distance / timeInSeconds) * 3600 / 1.60934;
    } else if (unit === 'run') {
      const speedInMilesPerHour = (distance / timeInSeconds) * 3600 / 0.621371;
      const timePerMileInHours = 1 / speedInMilesPerHour;
      const timePerMileInMinutes = timePerMileInHours * 60;
      speed = timePerMileInMinutes;
    }

    return speed;
  };

  const getChartData = (distanceData) => {
    return distanceData.map((entry) => {
      const time = entry[yAxisField];
      let speed = null;

      if (displaySpeed) {
        if (yAxisField === 'swimTime') speed = calculateSpeed(time, entry.swimDistance, 'swim');
        if (yAxisField === 'bikeTime') speed = calculateSpeed(time, entry.bikeDistance, 'bike');
        if (yAxisField === 'runTime') speed = calculateSpeed(time, entry.runDistance, 'run');
        if (yAxisField === 'totalTime') {
          const totalDistance =
            (entry.swimDistance || 0) +
            (entry.bikeDistance || 0) +
            (entry.runDistance || 0);
          speed = calculateSpeed(time, totalDistance, 'bike');
        }
      }

      return {
        x: entry.date,
        y: displaySpeed ? speed : time,
      };
    }).filter((entry) => entry.y !== null);
  };

  const isSpeedToggleVisible = ['swimTime', 'bikeTime', 'runTime', 'totalTime'].includes(yAxisField);

  const chartRefs = useRef([]);

  useEffect(() => {
    chartRefs.current.forEach((ref) => {
      if (ref && ref.chartInstance) {
        ref.chartInstance.destroy();
      }
    });
    chartRefs.current = new Array(Object.keys(groupedByDistance).length);
  }, [yAxisField, displaySpeed, groupedByDistance]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.round((totalSeconds % 1) * 10); // Round to 1 decimal place

    let timeString = '';
    if (hours > 0) timeString += `${String(hours).padStart(2, '0')}:`;
    if (minutes > 0 || hours > 0) timeString += `${String(minutes).padStart(2, '0')}:`;
    timeString += `${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(1, '0')}`;

    return timeString;
  };

  return (
    <div style={{ border: '3px solid #ccc', borderTop: 'none', borderRadius: '0px 0px 10px 10px' }}>
      <div style={{ padding: '10px' }} className="body">
        <h2>Analysis</h2>
        <p>{athlete.Name} analysis.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Dropdown to select Y-axis field */}
          <select onChange={(e) => setYAxisField(e.target.value)} value={yAxisField}>
            {timeFields.map((field) => (
              <option key={field} value={field}>
                {field.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (char) => char.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Toggle for time/speed */}
          {isSpeedToggleVisible && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={displaySpeed}
                onChange={() => setDisplaySpeed(!displaySpeed)}
              />
              Display Speed
            </label>
          )}
        </div>

        {/* Render graphs and additional info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.keys(groupedByDistance).map((distance, index) => (
            <div key={distance} style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* Chart Section */}
              <div style={{ flex: 3 }}>
                <h4>{distance} Distance</h4>
                <LineChart
                  data={getChartData(groupedByDistance[distance])}
                  yAxisLabel={displaySpeed ? 'Speed' : yAxisField}
                  ref={(el) => (chartRefs.current[index] = el)}
                  style={{
                    width: '100%',
                  }}
                />
              </div>

              {/* Additional Information Section */}
              <div style={{ flex: 1, padding: '10px', borderLeft: '1px solid #ccc' }}>
                <strong>
                  Average {displaySpeed ? 'Speed' : yAxisField.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (char) => char.toUpperCase())}:
                </strong>
                {(() => {
                  const values = groupedByDistance[distance]
                    .map((entry) =>
                      displaySpeed
                        ? calculateSpeed(entry[yAxisField], entry[`${yAxisField.replace('Time', 'Distance')}`], 
                          yAxisField === 'swimTime' ? 'swim' : yAxisField === 'bikeTime' ? 'bike' : 'run')
                        : entry[yAxisField]
                    )
                    .filter((val) => val !== null);
                  
                  const total = values.reduce((sum, val) => sum + val, 0);
                  const average = total / values.length;

                  if (displaySpeed) {
                    if (yAxisField === 'swimTime') {
                      const swimpace = new Date(average*1000).toISOString().slice(14,19);
                      return `${swimpace} /100 m`;
                    } else if (yAxisField === 'bikeTime') {
                      return `${average.toFixed(2)} mph`;
                    } else if (yAxisField === 'runTime') {
                      return `${average.toFixed(2)} minutes/mile`;
                    }
                  } else {
                    return formatTime(average);
                  }
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AthleteAnalysis;
