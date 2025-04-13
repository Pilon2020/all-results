import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function GeneralStats({ enrichedResults, athlete, races }) {
  const [fullResults, setFullResults] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [athletes, setAthletes] = useState([]);
  // Mapping from a value in the athlete's "participants" array to the athlete's Athlete_ID.
  const [participantToAthleteMap, setParticipantToAthleteMap] = useState({});

  useEffect(() => {
    const fetchFullResults = async () => {
      try {
        // Build a set of race IDs from the races object.
        const raceIDs = new Set();
        Object.values(races).forEach(yearGroup => {
          Object.values(yearGroup).forEach(raceArray => {
            raceArray.forEach(result => {
              if (result.Race_ID) raceIDs.add(result.Race_ID);
            });
          });
        });

        // Fetch all necessary data in parallel.
        const [resultsRes, participantsRes, athletesRes] = await Promise.all([
          fetch('http://localhost:5000/api/results'),
          fetch('http://localhost:5000/api/participants'),
          fetch('http://localhost:5000/api/athletes'),
        ]);

        const allResults = await resultsRes.json();
        const allParticipants = await participantsRes.json();
        const allAthletes = await athletesRes.json();

        // Filter results and participants based on raceIDs.
        const filteredResults = allResults.filter(r => raceIDs.has(r._race_id));
        const filteredParticipants = allParticipants.filter(p => raceIDs.has(p.Race_ID));

        // Build the mapping from participant values to Athlete_ID.
        const participantToAthleteMap = {};
        allAthletes.forEach(athlete => {
          if (Array.isArray(athlete.participants)) {
            athlete.participants.forEach(participantValue => {
              participantToAthleteMap[participantValue] = athlete.Athlete_ID;
            });
          }
        });

        setFullResults(filteredResults);
        setParticipants(filteredParticipants);
        setAthletes(allAthletes);
        setParticipantToAthleteMap(participantToAthleteMap);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchFullResults();
  }, [races]);

  if (!fullResults.length || !participants.length) {
    return (
      <div className="empty-state">
        <p className="no-records">Loading stats...</p>
      </div>
    );
  }

  // Exclude Mixed Relay races and any race with Overall_Rank <= 0.
  const validEnrichedResults = enrichedResults.filter(
    r => r.Distance !== 'Mixed Relay' && r.Overall_Rank > 0
  );
  const validFullResults = fullResults.filter(r => r.Distance !== 'Mixed Relay');

  // Build a map of participants.
  const participantMap = new Map();
  participants.forEach(p => participantMap.set(p.Participant_ID, p));

  // Overall finish breakdown stats.
  const placements = validEnrichedResults
    .map(r => r.Overall_Rank)
    .filter(rank => typeof rank === 'number');
  const finishBreakdown = {
    '1st': placements.filter(r => r === 1).length,
    'Top 3': placements.filter(r => r <= 3).length,
    'Top 10': placements.filter(r => r <= 10).length,
    'Top 25%': validEnrichedResults.filter(
      r => r.Total_Participants && r.Overall_Rank / r.Total_Participants <= 0.25
    ).length,
    'Finished': validEnrichedResults.length,
    'DNF': validEnrichedResults.filter(
      r => r.Finish_Status && r.Finish_Status.toLowerCase() !== 'finished'
    ).length,
  };

  // Helpers to convert and format time.
  const timeToSeconds = timeStr => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };
  const formatTime = secs => {
    if (!secs || isNaN(secs)) return 'N/A';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    return `${hours > 0 ? hours + ':' : ''}${(hours > 0 && minutes < 10) ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Compute the athlete's own name.
  const athleteName = athlete ? `${athlete['First Name']} ${athlete['Last Name']}` : '';

  // --- Head-to-head comparisons (Nemeses & Victims) ---
  const fasterArrays = [];
  const slowerArrays = [];
  const fasterDetails = [];
  const slowerDetails = [];

  validEnrichedResults.forEach(result => {
    const athleteSeconds = timeToSeconds(result.Total_Time);
    if (!athleteSeconds || athleteSeconds === 0) return;
    const athleteID = result.Athlete_ID;
    const athleteGender = result.Gender || participantMap.get(result.Participant_ID)?.Gender;
    const athleteDivision = participantMap.get(result.Participant_ID)?.Division;

    const thisRaceResults = validFullResults
      .filter(r => r._race_id === result._race_id)
      .map(r => ({
        ...r,
        timeSeconds: timeToSeconds(r.Total_Time),
      }))
      .filter(r => {
        const p = participantMap.get(r.Participant_ID);
        return (
          r.timeSeconds !== null &&
          r.timeSeconds > 0 &&
          p?.Gender === athleteGender &&
          p?.Division === athleteDivision
        );
      })
      .sort((a, b) => a.timeSeconds - b.timeSeconds);

    const athleteResult = thisRaceResults.find(r => r.Athlete_ID === athleteID);
    if (!athleteResult) return;
    const athleteTime = athleteResult.timeSeconds;

    // Nemeses.
    const faster = thisRaceResults.filter(r => r.timeSeconds < athleteSeconds).slice(-5);
    const fasterForRace = faster.map(f => {
      const name = `${f['First Name']} ${f['Last Name']}`;
      const margin = athleteSeconds - f.timeSeconds;
      return { name, margin, participantId: f.Participant_ID };
    });
    fasterArrays.push(fasterForRace.map(f => f.name));
    fasterDetails.push(...fasterForRace);

    // Victims.
    const slower = thisRaceResults.filter(r => r.timeSeconds > athleteSeconds).slice(0, 5);
    const slowerForRace = slower.map(s => {
      const name = `${s['First Name']} ${s['Last Name']}`;
      const margin = s.timeSeconds - athleteTime;
      return { name, margin, participantId: s.Participant_ID };
    });
    slowerArrays.push(slowerForRace.map(s => s.name));
    slowerDetails.push(...slowerForRace);
  });

  // Build win/loss stats.
  const winLossStats = {};
  fasterArrays.forEach(arr => {
    arr.forEach(name => {
      if (!winLossStats[name]) winLossStats[name] = { wins: 0, losses: 0 };
      winLossStats[name].losses++;
    });
  });
  slowerArrays.forEach(arr => {
    arr.forEach(name => {
      if (!winLossStats[name]) winLossStats[name] = { wins: 0, losses: 0 };
      winLossStats[name].wins++;
    });
  });

  // Aggregate margin data.
  const victimStats = {};
  slowerDetails.forEach(({ name, margin, participantId }) => {
    if (!victimStats[name]) {
      victimStats[name] = { count: 0, marginSum: 0, participantIds: new Set() };
    }
    victimStats[name].count += 1;
    victimStats[name].marginSum += margin;
    if (participantId) victimStats[name].participantIds.add(participantId);
  });
  const nemesisStats = {};
  fasterDetails.forEach(({ name, margin, participantId }) => {
    if (!nemesisStats[name]) {
      nemesisStats[name] = { count: 0, marginSum: 0, participantIds: new Set() };
    }
    nemesisStats[name].count += 1;
    nemesisStats[name].marginSum += margin;
    if (participantId) nemesisStats[name].participantIds.add(participantId);
  });

  // Prepare rows for Nemeses and Victims tables.
  const victimRows = Object.keys(victimStats)
    .filter(name => (winLossStats[name]?.wins + winLossStats[name]?.losses) >= 2)
    .map(name => {
      const athleteWins = winLossStats[name]?.wins || 0;
      const athleteLosses = winLossStats[name]?.losses || 0;
      const total = athleteWins + athleteLosses;
      const winPct = total ? Math.round((athleteWins / total) * 100) : 0;
      const avgMargin = Math.round(victimStats[name].marginSum / victimStats[name].count);
      return { name, wins: athleteWins, losses: athleteLosses, winPct, avgMargin };
    })
    .filter(row => row.wins > row.losses && row.avgMargin <= 300)
    .sort((a, b) => a.avgMargin - b.avgMargin)
    .slice(0, 5);
  const nemesisRows = Object.keys(nemesisStats)
    .filter(name => (winLossStats[name]?.wins + winLossStats[name]?.losses) >= 2)
    .map(name => {
      const athleteWins = winLossStats[name]?.wins || 0;
      const athleteLosses = winLossStats[name]?.losses || 0;
      const total = athleteWins + athleteLosses;
      const winPct = total ? Math.round((athleteWins / total) * 100) : 0;
      const avgMargin = Math.round(nemesisStats[name].marginSum / nemesisStats[name].count);
      return { name, wins: athleteWins, losses: athleteLosses, winPct, avgMargin };
    })
    .filter(row => row.losses > row.wins && row.avgMargin <= 300)
    .sort((a, b) => a.avgMargin - b.avgMargin)
    .slice(0, 5);

  // Compute overall performance stats.
  const totalRaces = validEnrichedResults.length;
  const bestRank = totalRaces ? Math.min(...validEnrichedResults.map(r => r.Overall_Rank)) : 'N/A';
  const worstRank = totalRaces ? Math.max(...validEnrichedResults.map(r => r.Overall_Rank)) : 'N/A';
  const avgRank = totalRaces
    ? (validEnrichedResults.reduce((sum, r) => sum + r.Overall_Rank, 0) / totalRaces).toFixed(1)
    : 'N/A';

  // Function to compute Average Finish Time by Distance.
  const getAvgFinishTimeByDistance = results => {
    const timeByDistance = results.reduce((acc, r) => {
      const dist = r.Distance;
      const secs = timeToSeconds(r.Total_Time);
      if (secs !== null) {
        if (!acc[dist]) {
          acc[dist] = { sum: 0, count: 0 };
        }
        acc[dist].sum += secs;
        acc[dist].count += 1;
      }
      return acc;
    }, {});
    return Object.entries(timeByDistance).map(([distance, { sum, count }]) => ({
      distance,
      avgFinishTime: formatTime(sum / count)
    }));
  };

  // Separate Regular (Non-Draft Legal) and Draft Legal results.
  const regularEnrichedResults = validEnrichedResults.filter(r => !r.draftLegal);
  const draftLegalEnrichedResults = validEnrichedResults.filter(r => r.draftLegal);

  const regularAvgFinishTimeByDistance = getAvgFinishTimeByDistance(regularEnrichedResults);
  const draftLegalAvgFinishTimeByDistance = getAvgFinishTimeByDistance(draftLegalEnrichedResults);

  // Races per Year Calculation.
  const racesPerYear = validEnrichedResults.reduce((acc, r) => {
    const year = new Date(r.Date).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="records-card">
      <h2 className="section-header">General Stats</h2>

      {/* Combined Overall Performance, Average Finish Time & Finish Breakdown Section */}
      <div className="record-section">
        <h4 className="section-subheader">Overall Performance & Finish Breakdown</h4>
        <div className="race-item" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '10px', 
            margin: '10px' 
          }}>
            {[
              { title: 'Total Races', value: finishBreakdown.Finished },
              { title: 'Best Rank', value: bestRank },
              { title: 'Worst Rank', value: worstRank },
              { title: 'Average Rank', value: avgRank },
            ].map(({ title, value }) => (
              <div key={title} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 'calc(100% - 20px)', 
                margin: '0 auto 5px auto',  
                padding: '10px',
              }}>
                <span className="race-title">{title}:</span>
                <span className="race-details">{value}</span>
              </div>
            ))}
          </div>

        <div>
              <h4>Finish Breakdown</h4>
              <div className="race-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px', margin:'10px'}}>
                  {Object.entries(finishBreakdown).map(([category, count]) => (
                    <div key={category} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: 'calc(100% - 20px)',
                      padding: '10px 10px',
                      marginBottom: '5px',
                      paddingRight:'10px',
                    }}>
                      <span className="race-title">{category}:</span>
                      <span className="race-details">{count}</span>
                    </div>
                  ))}
                </div>
            </div>
        {/* Consolidated Average Finish Time & Finish Breakdown Container */}
        <div className="sub-section">
          <h4>Average Finish Time & Finish Breakdown</h4>
            <div className="combined-details">
              <div className="avg-finish-time-section">
                <h5>Non-Draft Legal</h5>
                <ul className="race-list">
                  {regularAvgFinishTimeByDistance.map(({ distance, avgFinishTime }) => (
                    <li key={distance} className="race-item">
                      <span className="race-title">{distance}:</span>
                      <span className="race-details">{avgFinishTime}</span>
                    </li>
                  ))}
                </ul>
                <h5>Draft Legal</h5>
                <ul className="race-list">
                  {draftLegalAvgFinishTimeByDistance.map(({ distance, avgFinishTime }) => (
                    <li key={distance} className="race-item">
                      <span className="race-title">{distance}:</span>
                      <span className="race-details">{avgFinishTime}</span>
                    </li>
                  ))}
                </ul>
              </div>
          </div>
        </div>
      </div>

      {/* Nemeses Section */}
        <div>
          <h4>Top Nemeses</h4>
          <div className="race-item" style={{ padding: '10px', margin: '10px', flexDirection: 'column', paddingBottom:'0px'}}>
          {nemesisRows.length > 0 ? (
            <table className="stats-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nemesis</th>
                  <th style={{ textAlign: 'right' }}>Wins</th>
                  <th style={{ textAlign: 'right' }}>Losses</th>
                  <th style={{ textAlign: 'right' }}>Win%</th>
                  <th style={{ textAlign: 'right' }}>Margin (s)</th>
                </tr>
              </thead>
              <tbody>
                {nemesisRows.map(row => {
                  const participantIds = nemesisStats[row.name]?.participantIds;
                  const participantId = participantIds ? [...participantIds][0] : null;
                  const athleteID = participantToAthleteMap[participantId] || null;
                  return (
                    <tr key={row.name}>
                      <td><Link to={`/athlete/${athleteID}`}>{row.name}</Link></td>
                      <td style={{ textAlign: 'right' }}>{row.wins}</td>
                      <td style={{ textAlign: 'right' }}>{row.losses}</td>
                      <td style={{ textAlign: 'right' }}>{row.winPct}%</td>
                      <td style={{ textAlign: 'right' }}>{row.avgMargin}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div style={{ padding: '10px' }}>No nemeses found.</div>}
          </div>
        </div>

        {/* Victims Section */}
        <div >
          <h4>Top Victims</h4>
          <div className="race-item" style={{ padding: '10px', margin: '10px', flexDirection: 'column', paddingBottom:'0px'}}>
          {victimRows.length > 0 ? (
            <table className="stats-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Victim</th>
                  <th style={{ textAlign: 'right' }}>Wins</th>
                  <th style={{ textAlign: 'right' }}>Losses</th>
                  <th style={{ textAlign: 'right' }}>Win%</th>
                  <th style={{ textAlign: 'right' }}>Margin (s)</th>
                </tr>
              </thead>
              <tbody>
                {victimRows.map(row => {
                  const participantIds = victimStats[row.name]?.participantIds;
                  const participantId = participantIds ? [...participantIds][0] : null;
                  const athleteID = participantToAthleteMap[participantId] || null;
                  return (
                    <tr key={row.name}>
                      <td><Link to={`/athlete/${athleteID}`}>{row.name}</Link></td>
                      <td style={{ textAlign: 'right' }}>{row.wins}</td>
                      <td style={{ textAlign: 'right' }}>{row.losses}</td>
                      <td style={{ textAlign: 'right' }}>{row.winPct}%</td>
                      <td style={{ textAlign: 'right' }}>{row.avgMargin}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div style={{ padding: '10px' }}>No victims found.</div>}
          </div>
        </div>

        <div>
          <h4 style={{ textAlign: 'left' }}>Races per Year</h4>
          <div className="race-item" style={{margin:'10px', paddingBottom:'0px'}}>
          <table className="stats-table" style={{ width: '100%'}}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Year</th>
                <th style={{ textAlign: 'right' }}>Races</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(racesPerYear)
                .sort((a, b) => b[0] - a[0])
                .map(([year, count]) => (
                  <tr key={year}>
                    <td style={{ textAlign: 'left' }}>{year}</td>
                    <td style={{ textAlign: 'right' }}>{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
    </div>
  );
}

export default GeneralStats;
