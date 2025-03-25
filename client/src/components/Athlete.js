import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import RaceResults from './RaceResults';
import AthleteAnalysis from './athleteAnalysis';
import AthleteStats from './athleteStats';

function Athlete() {
  const { id } = useParams(); // Athlete_ID (string)
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('raceResults');
  const [showAllYears, setShowAllYears] = useState(false);
  const [enrichedResults, setEnrichedResults] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [yearlyPRs, setYearlyPRs] = useState({});
  const [allTimeRecords, setAllTimeRecords] = useState({});

  useEffect(() => {
    const fetchAthleteData = async () => {
      try {
        const athleteRes = await fetch(`http://localhost:5000/api/athleteInfo?id=${id}`);
        if (!athleteRes.ok) throw new Error("Failed to fetch athlete profile");
        const athleteData = await athleteRes.json();
        setAthlete(athleteData);

        const [resultsRes, racesRes, participantsRes] = await Promise.all([
          fetch("http://localhost:5000/api/results"),
          fetch("http://localhost:5000/api/races"),
          fetch("http://localhost:5000/api/participants")
        ]);

        if (!resultsRes.ok || !racesRes.ok || !participantsRes.ok) {
          throw new Error("Failed to fetch results, races, or participants");
        }

        const resultsData = await resultsRes.json();
        const racesData = await racesRes.json();
        const participantsData = await participantsRes.json();

        const participantIDs = new Set(athleteData.participants || []);
        const raceMap = new Map(racesData.map(r => [r.Race_ID, r]));
        const participantMap = new Map(participantsData.map(p => [p.Participant_ID, p]));

        const enrichedResults = resultsData
          .filter(r => participantIDs.has(r.Participant_ID))
          .map(r => {
            const race = raceMap.get(r._race_id || r.Race_ID) || {};
            const participant = participantMap.get(r.Participant_ID) || {};
            return {
              ...r,
              Race: race.Name || 'Unknown Race',
              Location: race.Location || 'Unknown',
              Date: race.Date || 'Unknown',
              Race_id: race._id,
              Race_ID: race.Race_ID,
              Distance: participant.Distance || race.Distance_Type || 'Unknown Distance',
              swimDistance: race.Swim_Distance || 0,
              bikeDistance: race.Bike_Distance || 0,
              runDistance: race.Run_Distance || 0,
              totalDistance: race.Total_Distance || 0,
            };
          });
        setEnrichedResults(enrichedResults);
        // Group by year + distance
        const grouped = enrichedResults.reduce((acc, result) => {
          const year = new Date(result.Date).getFullYear();
          const distance = result.Distance || 'Unknown Distance';
          if (!acc[year]) acc[year] = {};
          if (!acc[year][distance]) acc[year][distance] = [];
          acc[year][distance].push(result);
          return acc;
        }, {});
        setGroupedResults(grouped);
        // Calculate PRs
        const yearly = {};
        const allTime = {};

        Object.keys(grouped).forEach(year => {
          yearly[year] = {};

          Object.keys(grouped[year]).forEach(distance => {
            const best = grouped[year][distance].reduce(
              (prev, curr) => (!prev || curr.Total < prev.Total ? curr : prev),
              null
            );
            yearly[year][distance] = best;

            if (!allTime[distance] || best.Total < allTime[distance].Total) {
              allTime[distance] = { ...best, year };
            }
          });
        });

        setYearlyPRs(yearly);
        setAllTimeRecords(allTime);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAthleteData();
  }, [id]);

  const calculateAge = (dobYear) => {
    const currentYear = new Date().getFullYear();
    return dobYear ? currentYear - dobYear : 'N/A';
  };

  const handleViewRaceResult = (year) => {
    setActiveTab('raceResults');
    setShowAllYears(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading athlete data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">!</div>
        <p>{error}</p>
      </div>
    );
  }

  const mostRecentYear = Math.max(...Object.keys(groupedResults));
  const seasonRecords = groupedResults[mostRecentYear] || {};

  const tabTitles = {
    raceResults: "Race Results",
    athleteStats: "Stats",
    athleteAnalysis: "Analysis",
  };

  return (
    <div className='content'>
      {athlete ? (
        <div className='athlete-profile'>
          <div className="athlete-header">
            <h1>{athlete.First_Name} {athlete.Last_Name}</h1>
            <div className="athlete-info">
              <p className="hometown">
                <span className="info-label">Team:</span> {athlete.Team || 'N/A'}
              </p>
              <p className="age">
                <span className="info-label">Age:</span> {calculateAge(athlete.dob_year)}
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
                    enrichedResults={enrichedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={allTimeRecords}
                    showAllYears={showAllYears}
                  />
                )}
                {activeTab === 'athleteStats' && (
                  <AthleteStats
                    athlete={athlete}
                    enrichedResults={enrichedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={allTimeRecords}
                    showAllYears={showAllYears}
                    races={groupedResults}
                  />
                )}
              </div>
            </div>
            {/* Athlete PR Sidebar */}
            <div className="athlete-sidebar">
              <div className="records-card">
                <h2>Records</h2>

                <div className="record-section">
                  <h3>Current Season - {mostRecentYear}</h3>
                  {Object.keys(seasonRecords).length > 0 ? (
                    Object.keys(seasonRecords).map(distance => {
                      const bestResult = seasonRecords[distance].reduce(
                        (prev, curr) => (!prev || curr.Total < prev.Total ? curr : prev),
                        null
                      );

                      return (
                        <Link
                          to={`/race/${bestResult._id}/${athlete.Athlete_ID}`} /*need to use unique race ID from Race Table */
                          key={`current-${distance}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div className="record-item clickable" onClick={() => handleViewRaceResult(mostRecentYear)}>
                            <span className="distance">{distance}:</span>
                            <span className="time">{bestResult.Total_Time || 'No Time'}</span>
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
                    Object.keys(allTimeRecords).sort().map(distance => {
                      const yearsWithPRs = Object.keys(yearlyPRs)
                        .filter(year => yearlyPRs[year][distance])
                        .sort((a, b) => b - a);

                      return (
                        <div key={distance} className="lifetime-record">
                          <div className="distance-header">{distance}</div>
                          <div className="year-records">
                            {yearsWithPRs.map(year => {
                              const result = yearlyPRs[year][distance];
                              const isPR = result.Total_Time === allTimeRecords[distance].Total;

                              return (
                                <Link
                                  to={`/race/${result._id}/${athlete.Athlete_ID}`}
                                  key={`${distance}-${year}`}
                                  style={{ textDecoration: "none" }}
                                >
                                  <div
                                    className={`year-record ${isPR ? 'is-pr' : ''} clickable`}
                                    onClick={() => handleViewRaceResult(year)}
                                  >
                                    <div className="record-row">
                                      <span className="year">{year}:</span>
                                      {isPR && <span className="pr-badge">PR</span>}
                                      <span className="time">{result.Total_Time || 'No Time'}</span>
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
            {/* End Sidebar */}
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
