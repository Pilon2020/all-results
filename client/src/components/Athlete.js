import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

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
        const response = await fetch(`http://localhost:5000/api/athleteInfo?_id=${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Received data:", data); // Log the data for debugging

          // Find the athlete with the matching _id
          const foundAthlete = data.find(athlete => athlete._id.toString() === id);
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

  // Function to calculate age as of December 31st of the current year
  const calculateAge = (DOB) => {
    const dobDate = new Date(DOB); // Convert dob to a Date object
    const currentYear = new Date().getFullYear(); // Get the current year
    const endOfYear = new Date(currentYear, 11, 31); // Set the date to December 31st of the current year
    
    // Calculate the age difference
    let age = endOfYear.getFullYear() - dobDate.getFullYear();
    
    // Adjust age if birthday hasn't occurred yet this year
    const monthDifference = endOfYear.getMonth() - dobDate.getMonth();
    const dayDifference = endOfYear.getDate() - dobDate.getDate();
    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      age--;
    }
    
    return age;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Map raceResults to find results matching the athlete's name
  const matchingResults = raceResults.filter(result => result.Name === athlete?.Name);

  return (
    <div>
      {athlete ? (
        <div>
          <h1>{athlete.Name}</h1>
          <p>Hometown: {athlete.City} {athlete.State}, {athlete.Country}</p>
          <p>Age: {athlete.DOB ? calculateAge(athlete.DOB) : 'N/A'}</p> {/* Display calculated age */}
          <br></br>
          <br></br>
          <h2>Matching Race Results:</h2>
          <div className="race-container">
            {matchingResults.length > 0 ? (
              <ul className="race-list">
                {matchingResults.map((result, index) => (
                  <Link to={`/analysis/${result.race_id}`}>
                  <li key={index} className="race-item">
                    <div className="race-header">
                      <h2 className="race-title">{result.Race}</h2>
                      <div className="race-details">
                        <span className="race-date">{result.Date}</span>
                        <span className="race-location">{result.Location}</span>
                      </div>
                    </div>
                    <div className="race-body">
                      <span className="race-age-group">{result.AgeGroup}</span>
                      <span className="race-time">{result.Total}</span>
                    </div>
                  </li>
                  </Link>
                ))}
              </ul>
            ) : (
              <p>No race results found.</p>
            )}
          </div>
        </div>
      ) : (
        <p>No athlete data found</p>
      )}
    </div>
  );
}

export default Athlete;
