import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function Athlete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [raceResults, setRaceResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false); // Assume signed-in state is fetched elsewhere

  useEffect(() => {
    const fetchAthleteDetails = async () => {
      try {
        console.log("Fetching athlete details for ID:", id);

        const response = await fetch(`http://localhost:5000/api/athleteInfo?_id=${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Received data:", data);

          const foundAthlete = data.find(athlete => athlete._id.toString() === id);
          if (foundAthlete) {
            setAthlete(foundAthlete);
          } else {
            setError("Athlete not found.");
          }
        } else {
          setError("Failed to fetch athlete details.");
        }

        const raceResultsResponse = await fetch("http://localhost:5000/api/raceResults");
        if (raceResultsResponse.ok) {
          const raceResultsData = await raceResultsResponse.json();
          setRaceResults(raceResultsData);
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

  const handleClaimAthlete = async () => {
    if (!isSignedIn) {
      navigate("/sign-in");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/claimAthlete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ athleteId: id }),
      });

      if (response.ok) {
        alert("Athlete successfully claimed!");
      } else {
        alert("Failed to claim athlete.");
      }
    } catch (err) {
      console.error("Error claiming athlete:", err);
      alert("Error claiming athlete.");
    }
  };

  const calculateAge = (DOB) => {
    const dobDate = new Date(DOB);
    const currentYear = new Date().getFullYear();
    const endOfYear = new Date(currentYear, 11, 31);
    let age = endOfYear.getFullYear() - dobDate.getFullYear();

    const monthDifference = endOfYear.getMonth() - dobDate.getMonth();
    const dayDifference = endOfYear.getDate() - dobDate.getDate();
    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      age--;
    }
    return age;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const matchingResults = raceResults.filter(result => result.Name === athlete?.Name);

  const groupedResults = matchingResults.reduce((acc, result) => {
    const year = new Date(result.Date).getFullYear();
    if (!acc[year]) {
      acc[year] = {};
    }
    const distance = result.Distance || 'Unknown Distance';
    if (!acc[year][distance]) {
      acc[year][distance] = [];
    }
    acc[year][distance].push(result);
    return acc;
  }, {});

  const mostRecentYear = Math.max(...Object.keys(groupedResults));

  const seasonRecords = groupedResults[mostRecentYear] || {};
  const allTimeRecords = {};
  const yearlyPRs = {};

  Object.keys(groupedResults).forEach(year => {
    if (!yearlyPRs[year]) yearlyPRs[year] = {};

    Object.keys(groupedResults[year]).forEach(distance => {
        const bestTime = groupedResults[year][distance].reduce((best, current) => 
          !best || current.Total < best.Total ? current : best
        , null);

        yearlyPRs[year][distance] = bestTime;

      if (!allTimeRecords[distance] || bestTime.Total < allTimeRecords[distance].Total) {
        allTimeRecords[distance] = { ...bestTime, year };
      }
    });
  });

  return (
    <div className='content'>
      {athlete ? (
        <div className='body'>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>{athlete.Name}</h1>
            <button onClick={handleClaimAthlete} style={{
              padding: '10px 20px',
              backgroundColor: '#007BFF',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              {isSignedIn ? "Claim Athlete" : "Sign in to Claim"}
            </button>
          </div>
          <p>Hometown: {athlete.City} {athlete.State}, {athlete.Country}</p>
          <p>Age: {athlete.DOB ? calculateAge(athlete.DOB) : 'N/A'}</p>

          <div className="athlete-container">
            <div className="athlete-main">
              <h2 style={{paddingLeft:'10px'}}>Race Results:</h2>
              {Object.keys(groupedResults).sort((a, b) => b - a).map(year => (
                <div key={year} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
                  <h2>{year}</h2>
                  {Object.keys(groupedResults[year]).sort().map(distance => (
                    <div key={distance} style={{marginTop: '10px' }}>
                      <h3 style={{ color: '#555' }}>{distance}</h3>
                      <ul className="race-list">
                        {groupedResults[year][distance].map((result, index) => (
                          <a href={`/analysis/${result.Race_id}/${athlete._id}`} key={index}>
                            <li className="race-item" style={{ marginBottom: '10px', listStyle: 'none' }}>
                              <div className="race-header">
                                <h2 className="race-title" style={{ margin: '5px 0' }}>{result.Race}</h2>
                                <div className="race-details" style={{ fontSize: '14px', color: '#666' }}>
                                  <span className="race-date">{result.Date}</span>
                                  <span className="race-location" style={{ marginLeft: '10px' }}>{result.Location}</span>
                                </div>
                              </div>
                            </li>
                          </a>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="athlete-sidebar">
              <h2>Stats:</h2>
              <div className='athletestats'>
                <h3>Current Season - {mostRecentYear} </h3> 
                {Object.keys(seasonRecords).map(distance => (
                  <p key={distance}><b>{distance}:</b> {seasonRecords[distance][0].Total}</p>
                ))}

              <br />
              <h3>Season Records</h3>
              {Object.keys(allTimeRecords)
                .sort() // Sort distances alphabetically
                .map(distance => {
                  // Gather all years for the current distance and sort by descending year
                  const distanceYears = Object.keys(yearlyPRs)
                    .filter(year => yearlyPRs[year][distance]) // Only include years with results for this distance
                    .sort((a, b) => b - a); // Sort by descending year

                  return (
                    <div key={distance} style={{ marginBottom: '10px' }}>
                      {/* Distance Header */}
                      <p>
                        <b>{distance}:</b>
                      </p>

                      {/* Yearly Best Performances */}
                      {distanceYears.map(year => {
                        const yearlyBest = yearlyPRs[year][distance];
                        if (!yearlyBest) return null; // Skip if no result for this distance in the year

                        // Check if this year's time matches the overall PR
                        const isPR = yearlyBest.Total === allTimeRecords[distance].Total;

                        return (
                          <p
                            key={`${distance}-${year}`}
                            style={{
                              marginLeft: '15px',
                              fontWeight: isPR ? 'bold' : 'normal',
                              color: isPR ? '#007BFF' : 'inherit',
                            }}
                          >
                            {year}: {yearlyBest.Total}
                            {isPR && <span style={{ marginLeft: '5px' }}>PR</span>}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </div>
      ) : (
        <p>No athlete data found</p>
      )}
    </div>
  );
}

export default Athlete;