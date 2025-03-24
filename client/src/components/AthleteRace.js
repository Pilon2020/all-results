import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const RaceInfo = () => {
  const { id1, id2 } = useParams(); // Get id1 (race ID) and id2 (athlete ID) from URL
  const [raceInfo, setRaceInfo] = useState(null);
  const [raceResults, setRaceResults] = useState(null);
  const [error, setError] = useState(null);
  const segments = ['Swim', 'T1', 'Bike', 'T2', 'Run', 'Total'];

  // Fetch race info
  useEffect(() => {
    const fetchRaceInfo = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/raceInfo', {
          params: {
            id: id1, // Pass id1 (race ID) as a query parameter
          },
        });
        console.log('Race Info Response:', response.data);
        setRaceInfo(response.data);
      } catch (err) {
        setError('Error fetching race info: ' + (err.response?.data?.error || err.message));
        console.error('Error:', err);
      }
    };
    if (id1) {
      fetchRaceInfo();
    }
  }, [id1]);

  // Fetch race results based on athlete_id (id2) and race_id (id1)
  useEffect(() => {
    const fetchRaceResults = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/raceResults');
        const allResults = response.data;
        console.log('All Race Results:', allResults);

        // Filter results by Race ID (id1)
        const raceFilteredResults = allResults.filter((result) => result.Race_id === id1);
        console.log('Filtered Results by Race ID:', raceFilteredResults);

        // Further filter results by Athlete ID (id2)
        const athleteFilteredResults = raceFilteredResults.filter(
          (result) => result.Athlete_id === id2
        );
        console.log('Filtered Results by Athlete ID:', athleteFilteredResults);

        setRaceResults(athleteFilteredResults);
      } catch (err) {
        setError('Error fetching race results: ' + (err.response?.data?.error || err.message));
        console.error('Error:', err);
      }
    };

    if (id1) {
      fetchRaceResults();
    }
  }, [id1, id2]);

  if (error) {
    return <div>{error}</div>;
  }
  
  if (!raceInfo || !raceResults || raceResults.length === 0) {
    return <div>Loading...</div>;
  }

  const displayData = {
    athleteName: raceResults[0]?.Name || "Unknown Athlete",
    raceName: raceInfo[0]?.Name || "Unknown Race",
    raceYear: raceInfo[0]?.Date?.split('/')[2] || "Unknown Year",
    position: raceResults[0]?.Position || "N/A",
    ageGroup: raceResults[0]?.AgeGroup || "N/A",
    bibNumber: raceResults[0]?.BibNumber || "N/A",
    nationality: raceResults[0]?.Country || "N/A",
    swim: raceResults[0]?.Swim || "N/A",
    bike: raceResults[0]?.Bike || "N/A",
    run: raceResults[0]?.Run || "N/A",
    total: raceResults[0]?.Total || "N/A"
  };


  // Icon styles as base64 or SVG could be used here 
  // For simplicity, using emoji as placeholders
  const trophyIcon = "🏆";
  const peopleIcon = "👥"; 
  const hashtagIcon = "#️⃣";
  const globeIcon = "🌎";
  const swimIcon = "🏊";
  const bikeIcon = "🚴";
  const runIcon = "🏃";
  const flagIcon = "🏁";

  // Convert time string to seconds
  const timeToSeconds = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Convert seconds back to HH:MM:SS format
  const secondsToTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "700px", margin: "0 auto", padding: "10px" }}>
      {/* Navigation bar */}
      <div style={{ 
        backgroundColor: "#ff6f61", 
        color: "white", 
        padding: "20px 0", 
        marginBottom: "20px",
        display: "flex",
        gap: "20px",
        paddingLeft: "10px"
      }}>
      </div>

      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
        {displayData.athleteName} - {displayData.raceName} {displayData.raceYear}
      </h1>

      {/* Quick Facts Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ 
          backgroundColor: "#f5f5f5", 
          padding: "10px", 
          borderRadius: "5px",
          marginBottom: "10px"
        }}>
          <h2 style={{ 
            fontSize: "16px", 
            margin: "0", 
            padding: "0 0 5px 5px",
            borderBottom: "1px solid #ddd" 
          }}>
            Quick facts
          </h2>
        </div>

        {/* Quick Facts Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          textAlign: "center",
          borderLeft: "1px solid #ddd",
          borderRight: "1px solid #ddd",
          borderBottom: "1px solid #ddd",
          borderRadius: "0 0 5px 5px"
        }}>
          <div style={{ padding: "15px 0", borderRight: "1px solid #ddd" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{trophyIcon}</div>
            <div style={{ fontWeight: "bold" }}>{displayData.position}</div>
            <div style={{ fontSize: "12px", color: "#777" }}>All/Gender/AG</div>
          </div>
          
          <div style={{ padding: "15px 0", borderRight: "1px solid #ddd" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{peopleIcon}</div>
            <div style={{ fontWeight: "bold" }}>{displayData.ageGroup}</div>
            <div style={{ fontSize: "12px", color: "#777" }}>Age group</div>
          </div>
          
          <div style={{ padding: "15px 0", borderRight: "1px solid #ddd" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{hashtagIcon}</div>
            <div style={{ fontWeight: "bold" }}>{displayData.bibNumber}</div>
            <div style={{ fontSize: "12px", color: "#777" }}>Bib number</div>
          </div>
          
          <div style={{ padding: "15px 0" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{globeIcon}</div>
            <div style={{ fontWeight: "bold" }}>{displayData.nationality}</div>
            <div style={{ fontSize: "12px", color: "#777" }}>Nationality</div>
          </div>
        </div>
      </div>

      {/* Splits Section */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "5px",
        textAlign: "center",
        marginTop: "20px",
        border: "1px solid #ddd",
        borderRadius: "5px",
        marginBottom: "30px"
      }}>
        <div style={{ 
          padding: "20px 10px", 
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>{swimIcon}</div>
          <div style={{ fontWeight: "bold" }}>{displayData.swim}</div>
        </div>
        
        <div style={{ 
          padding: "20px 10px", 
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>{bikeIcon}</div>
          <div style={{ fontWeight: "bold" }}>{displayData.bike}</div>
        </div>
        
        <div style={{ 
          padding: "20px 10px", 
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>{runIcon}</div>
          <div style={{ fontWeight: "bold" }}>{displayData.run}</div>
        </div>
        
        <div style={{ 
          padding: "20px 10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>{flagIcon}</div>
          <div style={{ fontWeight: "bold" }}>{displayData.total}</div>
        </div>
      </div>
      <div>
          <h2> Segment Time</h2>
          <div className="race-results-table">
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Distance</th>
            <th>Time</th>
            <th>Speed</th>
            <th>Total Time</th>
          </tr>
        </thead>
        <tbody>
        {segments.map((segment, index) => {
            const segmentTime = raceResults[0]?.[segment] || "0:00:00";  // Get the segment time or default to "0:00:00"
            const segmentTimeInSeconds = timeToSeconds(segmentTime);

            let cumulativeTimeInSeconds = 0;

            // If we're dealing with the last segment (Total), use the total time for both
            if (segment === "Total") {
              cumulativeTimeInSeconds = timeToSeconds(raceResults[0]?.Total || "0:00:00"); // Use total time for the last row
            } else if (index === segments.length - 2) {
              // For the second-to-last segment, use the total time
              cumulativeTimeInSeconds = timeToSeconds(raceResults[0]?.Total || "0:00:00");
            } else {
              // For all other segments, calculate the cumulative time
              for (let i = 0; i <= index; i++) {
                const currentSegmentTime = raceResults[0]?.[segments[i]] || "0:00:00";
                cumulativeTimeInSeconds += timeToSeconds(currentSegmentTime);

                // Round down the cumulative time immediately after each addition
                cumulativeTimeInSeconds = Math.floor(cumulativeTimeInSeconds);
              }
            }

                // Convert cumulative time back to HH:MM:SS format
                const cumulativeTime = secondsToTime(cumulativeTimeInSeconds);

                return (
                  <tr key={segment}>
                    <td>{segment}</td>
                    <td>Distance</td>
                    <td>{segmentTime}</td>
                    <td>speed</td>
                    <td>{cumulativeTime}</td>
                  </tr>
                );
              })}
            </tbody>
      </table>
      </div>
        </div>
    </div>
  );
};

export default RaceInfo;