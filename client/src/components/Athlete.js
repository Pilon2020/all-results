import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import RaceResults from './RaceResults';
import AthleteAnalysis from './athleteAnalysis';
import AthleteStats from './athleteStats';

function Athlete() {
  const { id } = useParams(); // Athlete_ID (string)
  const location = useLocation();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('raceResults');
  const [showAllYears, setShowAllYears] = useState(false);
  const [enrichedResults, setEnrichedResults] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [yearlyPRs, setYearlyPRs] = useState({});

  // We'll build lifetime records in a detailed way:
  // lifetimeRegular[distance] and lifetimeDraft[distance] will be an array of { year, record }
  const [lifetimeRegular, setLifetimeRegular] = useState({});
  const [lifetimeDraft, setLifetimeDraft] = useState({});

  // Helper: Convert "HH:MM:SS" to total seconds for numeric comparisons.
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return Infinity;
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Reset active tab to "raceResults" whenever the location (URL) changes.
  useEffect(() => {
    setActiveTab('raceResults');
  }, [location.pathname]);

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

        // Enrich the results, adding draftLegal and Distance info.
        const enrichedResultsArr = resultsData
          .filter(r => participantIDs.has(r.Participant_ID))
          .map(r => {
            const race = raceMap.get(r._race_id || r.Race_ID) || {};
            const participant = participantMap.get(r.Participant_ID) || {};
            return {
              ...r,
              Race: race.Name || 'Unknown Race',
              Location: race.Location || 'Unknown',
              Date: race.Date || 'Unknown',
              race_id: race._id,
              Race_ID: race.Race_ID,
              Distance: participant.Distance || race.Distance_Type || 'Unknown Distance',
              swimDistance: race.Swim_Distance || 0,
              bikeDistance: race.Bike_Distance || 0,
              runDistance: race.Run_Distance || 0,
              totalDistance: race.Total_Distance || 0,
              draftLegal: race.Draft_Legal || false,
            };
          });
        setEnrichedResults(enrichedResultsArr);
        console.log(enrichedResultsArr);

        // Group enriched results by year and distance.
        const grouped = enrichedResultsArr.reduce((acc, result) => {
          const year = new Date(result.Date).getFullYear();
          const distance = result.Distance || 'Unknown Distance';
          if (!acc[year]) acc[year] = {};
          if (!acc[year][distance]) acc[year][distance] = [];
          acc[year][distance].push(result);
          return acc;
        }, {});
        setGroupedResults(grouped);

        // Calculate yearly PRs (for RaceResults component)
        const yearly = {};
        Object.keys(grouped).forEach(year => {
          yearly[year] = {};
          Object.keys(grouped[year]).forEach(distance => {
            const best = grouped[year][distance].reduce(
              (prev, curr) => (!prev || curr.Total < prev.Total ? curr : prev),
              null
            );
            yearly[year][distance] = best;
          });
        });
        setYearlyPRs(yearly);

        // Build lifetime records with an array for each distance.
        const _lifetimeRegular = {};
        const _lifetimeDraft = {};

        // Get sorted years (descending)
        const sortedYears = Object.keys(grouped)
          .map(Number)
          .sort((a, b) => b - a);

        // Collect all distances present
        const allDistancesSet = new Set();
        Object.values(grouped).forEach(yearGroup => {
          Object.keys(yearGroup).forEach(dist => allDistancesSet.add(dist));
        });
        const allDistances = [...allDistancesSet];

        allDistances.forEach(distance => {
          _lifetimeRegular[distance] = [];
          _lifetimeDraft[distance] = [];
          sortedYears.forEach(yearNum => {
            const yearGroup = grouped[yearNum];
            if (!yearGroup[distance]) return;
            const records = yearGroup[distance];
            // Regular category
            const reg = records.filter(r => !r.draftLegal);
            if (reg.length > 0) {
              const bestReg = reg.reduce((prev, curr) =>
                parseTimeToSeconds(curr.Total_Time) < parseTimeToSeconds(prev.Total_Time)
                  ? curr
                  : prev
              );
              _lifetimeRegular[distance].push({ year: yearNum, record: bestReg });
            }
            // Draft Legal category
            const draft = records.filter(r => r.draftLegal);
            if (draft.length > 0) {
              const bestDraft = draft.reduce((prev, curr) =>
                parseTimeToSeconds(curr.Total_Time) < parseTimeToSeconds(prev.Total_Time)
                  ? curr
                  : prev
              );
              _lifetimeDraft[distance].push({ year: yearNum, record: bestDraft });
            }
          });
        });
        setLifetimeRegular(_lifetimeRegular);
        setLifetimeDraft(_lifetimeDraft);
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
        <div className="loading-spinner" />
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

  // ------------------ Current Season ------------------
  // For the current season, we use the most recent year.
  const mostRecentYear = Math.max(...Object.keys(groupedResults));
  const seasonRecords = groupedResults[mostRecentYear] || {};
  const currentSeasonRegular = {};
  const currentSeasonDraft = {};
  Object.keys(seasonRecords).forEach(distance => {
    const recs = seasonRecords[distance];
    const reg = recs.filter(r => !r.draftLegal);
    if (reg.length > 0) {
      const best = reg.reduce((prev, curr) =>
        parseTimeToSeconds(curr.Total_Time) < parseTimeToSeconds(prev.Total_Time)
          ? curr
          : prev
      );
      currentSeasonRegular[distance] = best;
    }
    const draft = recs.filter(r => r.draftLegal);
    if (draft.length > 0) {
      const best = draft.reduce((prev, curr) =>
        parseTimeToSeconds(curr.Total_Time) < parseTimeToSeconds(prev.Total_Time)
          ? curr
          : prev
      );
      currentSeasonDraft[distance] = best;
    }
  });

  // Convert current season objects into the same format as lifetime arrays.
  const currentSeasonRegularByDistance = Object.entries(currentSeasonRegular).map(
    ([distance, record]) => ({ distance, yearRecords: [{ year: mostRecentYear, record }] })
  );
  const currentSeasonDraftByDistance = Object.entries(currentSeasonDraft).map(
    ([distance, record]) => ({ distance, yearRecords: [{ year: mostRecentYear, record }] })
  );

  // ------------------ Sidebar Rendering ------------------
  // Use the same formatting for both current season and lifetime
  const tabTitles = {
    raceResults: "Race Results",
    athleteStats: "Stats",
    athleteAnalysis: "Analysis",
  };

  return (
    <div className="content">
      {athlete ? (
        <div className="athlete-profile">
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
                    onClick={() => {
                      setActiveTab(tab);
                      setShowAllYears(false);
                    }}
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
                    allTimeRecords={{}}
                    showAllYears={showAllYears}
                    setShowAllYears={setShowAllYears}
                    race={enrichedResults}
                  />
                )}
                {activeTab === 'athleteAnalysis' && (
                  <AthleteAnalysis
                    athlete={athlete}
                    enrichedResults={enrichedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={{}}
                    showAllYears={showAllYears}
                  />
                )}
                {activeTab === 'athleteStats' && (
                  <AthleteStats
                    athlete={athlete}
                    enrichedResults={enrichedResults}
                    yearlyPRs={yearlyPRs}
                    allTimeRecords={{}}
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

                {/* Current Season Section using lifetime formatting */}
                <div className="record-section">
                  <h3>Current Season - {mostRecentYear}</h3>

                  {/* Regular */}
                  <div className="lifetime-regular">
                    <h4>Non-Draft Legal</h4>
                    {currentSeasonRegularByDistance.length > 0 &&
                      currentSeasonRegularByDistance.map(({ distance, yearRecords }) => (
                        <div key={`current-regular-${distance}`} className="distance-block">
                          <h5>{distance}</h5>
                          {yearRecords.map(({ year, record }) => (
                            <Link
                              key={`${distance}-${year}`}
                              to={`/race/${record.race_id}/${record._id}`}
                              style={{ textDecoration: 'none' }}
                              onClick={() => handleViewRaceResult(year)}
                            >
                              <div
                                className="pr-record clickable"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-start',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 0'
                                }}
                              >
                                <span className="year" style={{ flex: '0 0 auto' }}>
                                  {year}:
                                </span>
                                <span className="time" style={{ flex: '1 1 auto', textAlign: 'right', marginLeft: 'auto' }}>
                                  {record.Total_Time || 'No Time'}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                  </div>

                  {/* Draft Legal: Render only if there are any draft legal entries */}
                  {currentSeasonDraftByDistance.length > 0 && (
                    <div className="lifetime-draft">
                      <h4>Draft Legal</h4>
                      {currentSeasonDraftByDistance.map(({ distance, yearRecords }) => (
                        <div key={`current-draft-${distance}`} className="distance-block">
                          <h5>{distance}</h5>
                          {yearRecords.map(({ year, record }) => (
                            <Link
                              key={`${distance}-${year}`}
                              to={`/race/${record.race_id}/${record._id}`}
                              style={{ textDecoration: 'none' }}
                              onClick={() => handleViewRaceResult(year)}
                            >
                              <div
                                className="pr-record clickable"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-start',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 0'
                                }}
                              >
                                <span className="year" style={{ flex: '0 0 auto' }}>
                                  {year}:
                                </span>
                                <span className="time" style={{ flex: '1 1 auto', textAlign: 'right', marginLeft: 'auto' }}>
                                  {record.Total_Time || 'No Time'}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lifetime Section */}
                <div className="record-section">
                  <h3>Lifetime</h3>
                  <div className="lifetime-records">
                    {/* Regular */}
                    <div className="lifetime-regular">
                      <h4>Non-Draft Legal</h4>
                      {Object.entries(lifetimeRegular).map(([distance, yearRecords]) => {
                        if (!yearRecords || yearRecords.length === 0) return null;
                        return (
                          <div key={`regular-${distance}`} className="distance-block">
                            <h5>{distance}</h5>
                            {yearRecords.map(({ year, record }) => (
                              <Link
                                key={`${distance}-${year}`}
                                to={`/race/${record.race_id}/${record._id}`}
                                style={{ textDecoration: 'none' }}
                                onClick={() => handleViewRaceResult(year)}
                              >
                                <div
                                  className="pr-record clickable"
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    width: '100%',
                                    padding: '8px 0'
                                  }}
                                >
                                  <span className="year" style={{ flex: '0 0 auto' }}>
                                    {year}:
                                  </span>
                                  <span className="time" style={{ flex: '1 1 auto', textAlign: 'right', marginLeft: 'auto' }}>
                                    {record.Total_Time || 'No Time'}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Draft Legal: Render only if at least one lifetime draft record exists */}
                    {Object.entries(lifetimeDraft).some(([distance, yearRecords]) => yearRecords && yearRecords.length > 0) && (
                      <div className="lifetime-draft">
                        <h4>Draft Legal</h4>
                        {Object.entries(lifetimeDraft).map(([distance, yearRecords]) => {
                          if (!yearRecords || yearRecords.length === 0) return null;
                          return (
                            <div key={`draft-${distance}`} className="distance-block">
                              <h5>{distance}</h5>
                              {yearRecords.map(({ year, record }) => (
                                <Link
                                  key={`${distance}-${year}`}
                                  to={`/race/${record.race_id}/${record._id}`}
                                  style={{ textDecoration: 'none' }}
                                  onClick={() => handleViewRaceResult(year)}
                                >
                                  <div
                                    className="pr-record clickable"
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'flex-start',
                                      alignItems: 'center',
                                      width: '100%',
                                      padding: '8px 0'
                                    }}
                                  >
                                    <span className="year" style={{ flex: '0 0 auto' }}>
                                      {year}:
                                    </span>
                                    <span className="time" style={{ flex: '1 1 auto', textAlign: 'right', marginLeft: 'auto' }}>
                                      {record.Total_Time || 'No Time'}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* End Lifetime */}
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
