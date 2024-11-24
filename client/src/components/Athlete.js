import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function Athlete() {
  const { id } = useParams(); // Get the athlete ID from the URL
  const [athlete, setAthlete] = useState(null); // Store the athlete's details
  const [raceResults, setRaceResults] = useState([]); // Store the race results
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const fetchAthleteDetails = async () => {
      try {
        // Log the athlete ID to check if it's correct
        console.log("Fetching athlete details for ID:", id);

        // Fetch athlete details
        const response = await fetch(`http://localhost:5000/api/raceResults?id=${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Received data:", data); // Log the data for debugging

          // Find the athlete with the matching _id
          const foundAthlete = data.find(athlete => athlete._id === id);
          if (foundAthlete) {
            setAthlete(foundAthlete); // Set the athlete data
          } else {
            setError("Athlete not found.");
          }
        } else {
          setError("Failed to fetch athlete details.");
        }

        // Fetch race results for mapping
        const raceResultsResponse = await fetch("http://localhost:5000/api/raceResults");
        if (raceResultsResponse.ok) {
          const raceResultsData = await raceResultsResponse.json();
          setRaceResults(raceResultsData); // Set race results data
        } else {
          setError("Failed to fetch race results.");
        }
      } catch (err) {
        setError("Error fetching athlete or race results.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAthleteDetails();
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Map raceResults to find results matching the athlete's name
  const matchingResults = raceResults.filter(result => result.Name === athlete?.Name);

  return (
    <div>
      {athlete ? (
        <div>
          <h1>{athlete.Name}</h1>
          <p>Gender: {athlete.Gender}</p>
          <h2>Matching Race Results:</h2>
          {matchingResults.length > 0 ? (
            <ul>
              {matchingResults.map((result, index) => (
                <li key={index}>
                  <p>Race: {result.Race}</p>
                  <p>Finish Time: {result.Total}</p>
                  {/* Render other race result details */}
                </li>
              ))}
            </ul>
          ) : (
            <p>No matching race results found.</p>
          )}
        </div>
      ) : (
        <p>No athlete data found</p>
      )}
    </div>
  );
}

export default Athlete;
