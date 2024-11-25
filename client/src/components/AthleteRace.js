import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function Analysis() {
  const { id } = useParams(); // Get the race ID from the URL
  const [raceInfo, setRaceInfo] = useState(null); // Race-specific info
  const [result, setRaceResults] = useState(null); // Race-specific results
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const fetchRaceData = async () => {
      setLoading(true); // Set loading to true before fetching
      setError(null); // Clear any previous errors
      try {
        // Fetch race info
        const raceInfoResponse = await fetch(`http://localhost:5000/api/raceInfo?id=${id}`);
        const raceResultsResponse = await fetch(`http://localhost:5000/api/raceResults?id=${id}`);
        if (!raceInfoResponse.ok || !raceResultsResponse.ok) {
          throw new Error('Failed to fetch race data.');
        }

        const raceInfoData = await raceInfoResponse.json();
        const raceResultsData = await raceResultsResponse.json();
        console.log(raceInfoData)
        setRaceInfo(raceInfoData);
        setRaceResults(raceResultsData);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false); // Ensure loading is false after fetch completes
      }
    };

    fetchRaceData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Race Info Section */}
      {raceInfo ? (
        <div>
          <h1>Race: {raceInfo.Name}</h1>
          <p>Date: {raceInfo.Date}</p>
          <p>Location: {raceInfo.City}</p>
        </div>
      ) : (
        <p>No race info found.</p>
      )}
    </div>
  );
}

export default Analysis;
