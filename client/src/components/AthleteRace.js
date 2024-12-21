import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const RaceInfo = () => {
  const { id1, id2 } = useParams(); // Get id1 (race ID) and id2 (athlete ID) from URL
  const [raceInfo, setRaceInfo] = useState(null);
  const [raceResults, setRaceResults] = useState(null); // For storing race results data
  const [error, setError] = useState(null);

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
        setRaceInfo(response.data);  // Store the response in state
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
        // Fetch all race results from the API
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
  
        // Store the doubly filtered results in state
        setRaceResults(athleteFilteredResults);
      } catch (err) {
        setError('Error fetching race results: ' + (err.response?.data?.error || err.message));
        console.error('Error:', err);
      }
    };
  
    if (id1) { // Ensure Race ID is available
      fetchRaceResults();
    }
  }, [id1, id2]); // Dependencies
   // Dependencies to trigger fetching when id1 or id2 changes

  if (error) {
    return <div>{error}</div>;
  }

  if (!raceInfo || !raceResults) {
    return <div>Loading...</div>;
  }

  

  return (
    <div style={{padding:'10px'}}>
      {raceInfo.length === 0 ? (
        <div>No race info found for this ID.</div>
      ) : (
        <div>
          <h1>{raceResults[0].Name} - {raceInfo[0].Name} {raceInfo[0].Date.split('/')[2]}</h1>
          <p>{raceInfo[0].City}, {raceInfo[0].State} - <strong>{raceInfo[0].Date}</strong></p> 
        </div>
      )}
      <h2>Quick Facts</h2>
        <div>
          <p>Age Group: <strong>{raceResults[0].AgeGroup}</strong> </p>
        </div>
      <h2>Splits</h2>
      {raceResults ? (
        <div>
          <p><strong>Swim:</strong> {raceResults[0].Swim} | <strong>T1:</strong> {raceResults[0].T1} | <strong>Bike:</strong> {raceResults[0].Bike} | <strong>T2:</strong> {raceResults[0].T2} | <strong>Run:</strong> {raceResults[0].Run}</p>
          <p><strong>Total Time:</strong> {raceResults[0].Total}</p>
        </div>
      ) : (
        <div>No results found for this athlete in this race.</div>
      )}
    </div>
  );
};

export default RaceInfo;
