import React, { useEffect, useState } from 'react';
import { useParams} from 'react-router-dom';
import RaceResults from './RaceResults';
import AthleteAnalysis from './athleteAnalysis';
import AthleteStats from './athleteStats';
import AthleteCompare from './athleteCompare';

function Athlete() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [raceResults, setRaceResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('raceResults'); 
  const [showAllYears, setShowAllYears] = useState(false);

  useEffect(() => {
    const fetchAthleteDetails = async () => {
      try {
        console.log("Fetching athlete details for ID:", id);

        const response = await fetch(`http://localhost:5000/api/athleteInfo?_id=${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Received data:", data)

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

  // Group results by year and calculate records
const groupedResults = matchingResults.reduce((acc, result) => {
  const year = new Date(result.Date).getFullYear();
  if (!acc[year]) acc[year] = {};
  const distance = result.Distance || 'Unknown Distance';
  if (!acc[year][distance]) acc[year][distance] = [];
  acc[year][distance].push(result);
  return acc;
}, {});

// Initialize records
const allTimeRecords = {};
const yearlyPRs = {};

// Calculate records
Object.keys(groupedResults).forEach(year => {
  if (!yearlyPRs[year]) yearlyPRs[year] = {};

  Object.keys(groupedResults[year]).forEach(distance => {
    const bestTime = groupedResults[year][distance].reduce(
      (best, current) => (!best || current.Total < best.Total ? current : best),
      null
    );

    yearlyPRs[year][distance] = bestTime;

    if (!allTimeRecords[distance] || bestTime.Total < allTimeRecords[distance].Total) {
      allTimeRecords[distance] = { ...bestTime, year };
    }
  });
});

  const mostRecentYear = Math.max(...Object.keys(groupedResults));
  const seasonRecords = groupedResults[mostRecentYear] || {};
  const tabTitles = {
    raceResults: "Race Results",
    athleteAnalysis: "Analysis",
    athleteStats: "Stats",
    athleteCompare: "Compare",
  };

  return (
    <div className='content'>
      {athlete ? (
        <div className='body'>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>{athlete.Name}</h1>
          </div>
          <div className="athlete-info" style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ marginRight: '20vw' }}>
              Hometown: {athlete.City} {athlete.State}, {athlete.Country}
            </p>
            <p>
              Age: {athlete.DOB ? calculateAge(athlete.DOB) : 'N/A'}
            </p>
          </div>
          <div className="athlete-container">
          <div className="athlete-main">
          <div className="tabs" style={{ display: 'flex', justifyContent: 'space-evenly' }}>
            {Object.keys(tabTitles).map(tab => (
              <h2
                key={tab}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab); setShowAllYears(false); }}
                style={{
                  paddingLeft: '10px',
                  paddingRight: '10px',
                  backgroundColor: activeTab === tab ? 'white' : 'gray',
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer',
                  textAlign: 'center',
                  flex: 1,
                  borderRadius: '10px 10px 0px 0px',
                  border: '3px solid #ccc',
                  borderBottom: 'none',
                }}
              >
                {tabTitles[tab]}
              </h2>
            ))}
          </div>
              <div className="tab-content">
                {activeTab === 'raceResults' && (
                  <RaceResults
                    athlete={athlete}
                    groupedResults={groupedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={allTimeRecords}
                    showAllYears={showAllYears}
                    setShowAllYears={setShowAllYears} // Pass this as a prop
                  />
                )}
                {activeTab === 'athleteAnalysis' && (
                  <AthleteAnalysis 
                  athlete={athlete}
                  groupedResults={groupedResults}
                  yearlyPRs={yearlyPRs}
                />
                )}
                {activeTab === 'athleteStats' && (
                  <AthleteStats 
                  athlete={athlete}
                  groupedResults={groupedResults}
                  yearlyPRs={yearlyPRs}
                  allTimeRecords={allTimeRecords}
                  showAllYears={showAllYears}
                  setShowAllYears={setShowAllYears} // Pass this as a prop
                />
                )}
                {activeTab === 'athleteCompare' && (
                  <AthleteCompare 
                  athlete={athlete}
                  groupedResults={groupedResults}
                  yearlyPRs={yearlyPRs}
                  allTimeRecords={allTimeRecords}
                  showAllYears={showAllYears}
                  setShowAllYears={setShowAllYears} // Pass this as a prop
                />
                )}
              </div>
            </div>
            
            
            <div className="athlete-sidebar">
              <h2>Records:</h2>
              <div className='athletestats'>
                <h3>Current Season - {mostRecentYear} </h3> 
                {Object.keys(seasonRecords).map(distance => (
                  <p key={distance}><b>{distance}:</b> {seasonRecords[distance][0].Total}</p>
                ))}

              <br />
              <h3>Lifetime</h3>
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