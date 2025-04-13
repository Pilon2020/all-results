import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const RaceInfo = () => {
  const { race_id } = useParams();
  const [raceData, setRaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log(race_id)
    // Define an async function inside useEffect
    const fetchRaceData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/races?_id=${race_id}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setRaceData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRaceData();
  }, [race_id]);

  console.log(raceData)
  if (loading) return <div>Loading race information...</div>;
  if (error) return <div>Error: {error}</div>;


  return (
    <div style={{ fontFamily: "Arial, sans-serif", paddingTop: "50px", margin: "10px", }}>
      <h1>Race Info</h1>
      <p><strong>Race ID:</strong> {race_id}</p>
      {raceData && (
        <div>
          <p>Name: {raceData.Name}</p>
      </div>
      )}
    </div>
  );
};

export default RaceInfo;
