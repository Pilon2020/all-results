import React, { useState, useEffect, useRef } from 'react';
import LineChart from './LineChart';

function AthleteAnalysis({ athlete, enrichedResults }) {
  const [yAxisField, setYAxisField] = useState('swimTime');
  const [displaySpeed, setDisplaySpeed] = useState(false);
  const [unitSystem, setUnitSystem] = useState('metric');
  const chartRefs = useRef([]);

  const timeFields = ['swimTime', 't1', 'bikeTime', 't2', 'runTime', 'totalTime'];

  const convertTimeToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return null;
    const parts = timeString.split(':').map(Number);
    return parts.reduce((acc, val) => acc * 60 + val, 0);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return 'N/A';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Helper to format pace as MM:SS
  const formatPace = (paceInMinutes) => {
    const totalSeconds = Math.round(paceInMinutes * 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Tooltip formatter that handles swim and run pace formatting
  const formatTooltip = (value) => {
    if (displaySpeed) {
      if (yAxisField === 'swimTime') {
        return `${formatPace(value)} min/${unitSystem === 'imperial' ? '100yd' : '100m'}`;
      }
      if (yAxisField === 'runTime') {
        return `${formatPace(value)} min/${unitSystem === 'imperial' ? 'mi' : 'km'}`;
      }
      if (['bikeTime', 'totalTime'].includes(yAxisField)) {
        return `${value.toFixed(2)} ${unitSystem === 'imperial' ? 'mph' : 'km/h'}`;
      }
    }
    return formatTime(value);
  };

  const calculateSpeed = (timeInSec, distanceKm, fieldType) => {
    if (!timeInSec || !distanceKm || isNaN(timeInSec) || isNaN(distanceKm)) return null;
    const distanceMi = distanceKm * 0.621371;

    if (fieldType === 'swim') {
      const poolLength = unitSystem === 'imperial' ? 91.44 : 100;
      const pacePer100 = (timeInSec / (distanceKm * 1000)) * poolLength;
      // Return pace in minutes as a decimal (to be formatted later)
      return pacePer100 / 60;
    }

    if (fieldType === 'bike' || fieldType === 'total') {
      return unitSystem === 'imperial'
        ? (distanceMi / timeInSec) * 3600
        : (distanceKm / timeInSec) * 3600;
    }

    if (fieldType === 'run') {
      return unitSystem === 'imperial'
        ? (timeInSec / distanceMi) / 60
        : (timeInSec / distanceKm) / 60;
    }

    return null;
  };

  const data = enrichedResults.map(result => {
    const parsedDate = new Date(result.Date);
    if (!parsedDate || isNaN(parsedDate)) return null;

    return {
      date: parsedDate,
      race: result.Race,
      distance: result.Distance,
      swimDistance: result.swimDistance,
      bikeDistance: result.bikeDistance,
      runDistance: result.runDistance,
      totalDistance: result.TotalDistance || (
        result.swimDistance + result.bikeDistance + result.runDistance
      ),
      swimTime: convertTimeToSeconds(result.Swim_Time),
      t1: convertTimeToSeconds(result.T1_Time),
      bikeTime: convertTimeToSeconds(result.Bike_Time),
      t2: convertTimeToSeconds(result.T2_Time),
      runTime: convertTimeToSeconds(result.Run_Time),
      totalTime: convertTimeToSeconds(result.Total_Time),
    };
  }).filter(Boolean);

  const groupedByDistance = data.reduce((acc, entry) => {
    if (!acc[entry.distance]) acc[entry.distance] = [];
    acc[entry.distance].push(entry);
    return acc;
  }, {});

  const getChartData = (entries) => {
    return entries.map(entry => {
      const raw = entry[yAxisField];
      let value;

      if (displaySpeed) {
        const dist = yAxisField === 'totalTime'
          ? entry.totalDistance
          : entry[yAxisField.replace('Time', 'Distance')];

        const fieldType = yAxisField === 'swimTime'
          ? 'swim'
          : yAxisField === 'bikeTime'
          ? 'bike'
          : yAxisField === 'totalTime'
          ? 'total'
          : yAxisField === 'runTime'
          ? 'run'
          : 'unknown';

        value = calculateSpeed(raw, dist, fieldType);
      } else {
        value = raw;
      }

      if (value === null || isNaN(value)) return null;

      return {
        x: entry.date.toLocaleDateString('en-US'),
        y: value
      };
    }).filter(Boolean);
  };

  const isSpeedToggleVisible = ['swimTime', 'bikeTime', 'runTime', 'totalTime'].includes(yAxisField);
  const isUnitToggleEnabled = isSpeedToggleVisible;

  const handleYAxisChange = (value) => {
    if (value === 't1' || value === 't2') {
      setDisplaySpeed(false);
    }
    setYAxisField(value);
  };

  useEffect(() => {
    chartRefs.current.forEach(ref => {
      if (ref?.chartInstance) ref.chartInstance.destroy();
    });
    chartRefs.current = new Array(Object.keys(groupedByDistance).length);
  }, [yAxisField, displaySpeed, unitSystem]);

  return (
    <div>
      <div className="toggle-controls">
        <select
          value={yAxisField}
          onChange={(e) => handleYAxisChange(e.target.value)}
          className="tab-button"
        >
          {timeFields.map(field => (
            <option key={field} value={field}>
              {field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
            </option>
          ))}
        </select>

        <div className="speed-toggles">
          <label className={isSpeedToggleVisible ? '' : 'disabled'}>
            <input
              type="checkbox"
              checked={displaySpeed}
              onChange={() => setDisplaySpeed(!displaySpeed)}
              disabled={!isSpeedToggleVisible}
            />
            Display Speed
          </label>

          <div className={`unit-toggle ${isUnitToggleEnabled ? '' : 'disabled'}`}>
            <span>Metric</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={unitSystem === 'imperial'}
                onChange={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
                disabled={!isUnitToggleEnabled}
              />
              <span className="slider"></span>
            </label>
            <span>Imperial</span>
          </div>
        </div>
      </div>

      {['Sprint', 'Olympic', 'Mixed Relay'].filter(d => groupedByDistance[d]).map((distance, i) => {
        const entries = groupedByDistance[distance];

        const values = entries.map(entry => {
          const raw = entry[yAxisField];
          if (!displaySpeed) return raw;

          const dist = yAxisField === 'totalTime'
            ? entry.totalDistance
            : entry[yAxisField.replace('Time', 'Distance')];

          const fieldType = yAxisField === 'swimTime'
            ? 'swim'
            : yAxisField === 'bikeTime'
            ? 'bike'
            : yAxisField === 'totalTime'
            ? 'total'
            : yAxisField === 'runTime'
            ? 'run'
            : 'unknown';

          return calculateSpeed(raw, dist, fieldType);
        }).filter(val => val !== null && !isNaN(val));

        const avg = values.length > 0
          ? values.reduce((sum, val) => sum + val, 0) / values.length
          : null;

        const avgDisplay = avg !== null && !isNaN(avg)
          ? (displaySpeed
            ? yAxisField === 'swimTime'
              ? `${formatPace(avg)} min/${unitSystem === 'imperial' ? '100yd' : '100m'}`
              : yAxisField === 'runTime'
              ? `${formatPace(avg)} min/${unitSystem === 'imperial' ? 'mi' : 'km'}`
              : ['bikeTime', 'totalTime'].includes(yAxisField)
              ? `${avg.toFixed(2)} ${unitSystem === 'imperial' ? 'mph' : 'km/h'}`
              : ''
            : formatTime(avg))
          : 'N/A';

        return (
          <div key={distance} className="year-section">
            <div className="record-section">
              <h3>{distance}</h3>
              <div className="athlete-container">
                <div className="athlete-main">
                  <LineChart
                    data={getChartData(entries)}
                    yAxisLabel={displaySpeed ? 'Speed' : yAxisField}
                    tooltipFormatter={formatTooltip}
                    ref={el => (chartRefs.current[i] = el)}
                  />
                </div>
                <div className="athlete-sidebar">
                  <div className="records-card">
                    <h2>Stats</h2>
                    <div className="record-item">
                      <span className="distance">Average:</span>
                      <span className="time">{avgDisplay}</span>
                    </div>
                    <div className="record-item">
                      <span className="distance">Events:</span>
                      <span className="time">{entries.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AthleteAnalysis;
