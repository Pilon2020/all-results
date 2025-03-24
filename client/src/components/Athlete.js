import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
        const response = await fetch(`http://localhost:5000/api/athleteInfo?_id=${id}`);
        if (response.ok) {
          const data = await response.json();
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

  // Handler to switch to race results tab and show specific year
  const handleViewRaceResult = (year) => {
    setActiveTab('raceResults');
    setShowAllYears(true); // Ensure all years are visible to show the selected year
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading athlete data...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <div className="error-icon">!</div>
      <p>{error}</p>
    </div>
  );

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
        <div className='athlete-profile'>
          <div className="athlete-header">
            <h1>{athlete.Name}</h1>
            <div className="athlete-info">
              <p className="hometown">
                <span className="info-label">Hometown:</span> {athlete.City} {athlete.State}, {athlete.Country}
              </p>
              <p className="age">
                <span className="info-label">Age:</span> {athlete.DOB ? calculateAge(athlete.DOB) : 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="athlete-container">
            <div className="athlete-main">
              <div className="tabs">
                {Object.keys(tabTitles).map(tab => (
                  <button
                    key={tab}
                    className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => { setActiveTab(tab); setShowAllYears(false); }}
                  >
                    {tabTitles[tab]}
                  </button>
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
                    setShowAllYears={setShowAllYears}
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
                    setShowAllYears={setShowAllYears}
                  />
                )}
                {activeTab === 'athleteCompare' && (
                  <AthleteCompare 
                    athlete={athlete}
                    groupedResults={groupedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={allTimeRecords}
                    showAllYears={showAllYears}
                    setShowAllYears={setShowAllYears}
                  />
                )}
              </div>
            </div>
            
            <div className="athlete-sidebar">
              <div className="records-card">
                <h2>Records</h2>
                <div className="record-section">
                  <h3>Current Season - {mostRecentYear}</h3>
                  {Object.keys(seasonRecords).length > 0 ? (
                    Object.keys(seasonRecords).map(distance => {
                      const bestResult = seasonRecords[distance].reduce(
                        (best, current) => (!best || current.Total < best.Total ? current : best),
                        null
                      );
                      
                      return (
                        <Link 
                          to={`/analysis/${bestResult.Race_id}/${athlete._id}`} 
                          key={`current-${distance}`} 
                          style={{textDecoration: "none"}}
                        >
                          <div className="record-item clickable" onClick={() => handleViewRaceResult(mostRecentYear)}>
                            <span className="distance">{distance}:</span>
                            <span className="time">{bestResult.Total}</span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="no-records">No records for current season</p>
                  )}
                </div>

                <div className="record-section">
                  <h3>Lifetime</h3>
                  {Object.keys(allTimeRecords).length > 0 ? (
                    Object.keys(allTimeRecords)
                      .sort()
                      .map(distance => {
                        const distanceYears = Object.keys(yearlyPRs)
                          .filter(year => yearlyPRs[year][distance])
                          .sort((a, b) => b - a);

                        return (
                          <div key={distance} className="lifetime-record">
                            <div className="distance-header">{distance}</div>
                            <div className="year-records">
                              {distanceYears.map((year) => {
                                const yearlyBest = yearlyPRs[year][distance];
                                if (!yearlyBest) return null;
                                const isPR = yearlyBest.Total === allTimeRecords[distance].Total;

                                return (
                                  <Link to={`/analysis/${yearlyBest.Race_id}/${athlete._id}`} key={`${distance}-${year}`} style={{textDecoration: "none"}}>
                                    <div 
                                      className={`year-record ${isPR ? 'is-pr' : ''} clickable`}
                                      onClick={() => handleViewRaceResult(year)}
                                    >
                                      <div className="record-row">
                                        <span className="year">{year}:</span>
                                        {isPR && <span className="pr-badge">PR</span>}
                                        <span className="time">{yearlyBest.Total}</span>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="no-records">No lifetime records available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🏃</div>
          <p>No athlete data found</p>
        </div>
      )}
    </div>
  );
}

export default Athlete;