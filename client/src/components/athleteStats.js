import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function GeneralStats({ enrichedResults, athlete, races }) {
  const [fullResults, setFullResults] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const fetchFullResults = async () => {
      try {
        const raceIDs = new Set();
        Object.values(races).forEach(yearGroup => {
          Object.values(yearGroup).forEach(raceArray => {
            raceArray.forEach(result => {
              if (result.Race_id) raceIDs.add(result.Race_id);
            });
          });
        });
        const [resultsRes, participantsRes] = await Promise.all([
          fetch('http://localhost:5000/api/results'),
          fetch('http://localhost:5000/api/participants')
        ]);
        const allResults = await resultsRes.json();
        const allParticipants = await participantsRes.json();
        const filteredResults = allResults.filter(r => raceIDs.has(r._race_id));
        const filteredParticipants = allParticipants.filter(p => raceIDs.has(p.Race_ID));
        setFullResults(filteredResults);
        setParticipants(filteredParticipants);
      } catch (err) {
        console.error("Error fetching full results or participants:", err);
      }
    };
    fetchFullResults();
  }, [races]);

  if (!fullResults.length || !participants.length) return <p>Loading stats...</p>;

  // Exclude Mixed Relay races and any race with Overall_Rank <= 0
  const validEnrichedResults = enrichedResults.filter(r => r.Distance !== 'Mixed Relay' && r.Overall_Rank > 0);
  const validFullResults = fullResults.filter(r => r.Distance !== 'Mixed Relay');

  // Build a map of participants
  const participantMap = new Map();
  participants.forEach(p => participantMap.set(p.Participant_ID, p));

  // Overall finish breakdown stats
  const placements = validEnrichedResults
    .map(r => r.Overall_Rank)
    .filter(rank => typeof rank === 'number');
  const finishBreakdown = {
    '1st': placements.filter(r => r === 1).length,
    'Top 3': placements.filter(r => r <= 3).length,
    'Top 10': placements.filter(r => r <= 10).length,
    'Top 25%': validEnrichedResults.filter(r => r.Total_Participants && r.Overall_Rank / r.Total_Participants <= 0.25).length,
    'Finished': validEnrichedResults.length,
    'DNF': validEnrichedResults.filter(r => r.Finish_Status && r.Finish_Status.toLowerCase() !== 'finished').length
  };

  // Helpers to convert and format time
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return 'N/A';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    return `${hours > 0 ? hours + ':' : ''}${(hours > 0 && minutes < 10) ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Compute the athlete's own name so we can exclude it from head-to-head comparisons
  const athleteName = athlete ? `${athlete['First Name']} ${athlete['Last Name']}` : '';

  // --- Use your working nemeses/victims code ---
  // For each valid enriched result (i.e. each race), accumulate head-to-head data.
  const fasterArrays = [];   // Competitors that finished faster than the athlete (i.e. athlete losses)
  const slowerArrays = [];   // Competitors that finished slower (athlete wins)
  const fasterDetails = [];  // Detailed margin info for nemeses
  const slowerDetails = [];  // Detailed margin info for victims

  validEnrichedResults.forEach(result => {
    const athleteSeconds = timeToSeconds(result.Total_Time);
    if (!athleteSeconds || athleteSeconds === 0) return;
    const athleteID = result.Athlete_ID;
    const athleteGender = result.Gender || (participantMap.get(result.Participant_ID)?.Gender);
    const athleteDivision = participantMap.get(result.Participant_ID)?.Division;

    const thisRaceResults = validFullResults
      .filter(r => r._race_id === result._race_id)
      .map(r => ({
        ...r,
        timeSeconds: timeToSeconds(r.Total_Time)
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

// Nemeses: competitors that finished faster than the athlete.
const faster = thisRaceResults.filter(r => r.timeSeconds < athleteSeconds).slice(-5);
const fasterForRace = faster.map(f => {
  const name = `${f['First Name']} ${f['Last Name']}`;
  // Margin: difference in seconds (athlete lost by)
  const margin = athleteSeconds - f.timeSeconds;
  return { name, margin };
});
fasterArrays.push(fasterForRace.map(f => f.name));
fasterDetails.push(...fasterForRace);

// Victims: competitors that finished slower than the athlete.
const slower = thisRaceResults.filter(r => r.timeSeconds > athleteSeconds).slice(0, 5);
const slowerForRace = slower.map(s => {
  const name = `${s['First Name']} ${s['Last Name']}`;
  // Margin: difference in seconds (athlete won by)
  const margin = s.timeSeconds - athleteSeconds;
  return { name, margin };
});
slowerArrays.push(slowerForRace.map(s => s.name));
slowerDetails.push(...slowerForRace);
});

// Build overall win/loss stats (from the athlete's perspective)
// - When a competitor is in fasterArrays, the athlete lost that race.
// - When in slowerArrays, the athlete won.
const winLossStats = {};
fasterArrays.forEach(arr => {
arr.forEach(name => {
  if (!winLossStats[name]) winLossStats[name] = { wins: 0, losses: 0 };
  winLossStats[name].losses++; // competitor beat athlete → athlete loss
});
});
slowerArrays.forEach(arr => {
arr.forEach(name => {
  if (!winLossStats[name]) winLossStats[name] = { wins: 0, losses: 0 };
  winLossStats[name].wins++; // athlete beat competitor → athlete win
});
});

// Aggregate margin data for victims from slowerDetails.
const victimStats = {};
slowerDetails.forEach(({ name, margin }) => {
if (!victimStats[name]) {
  victimStats[name] = { count: 0, marginSum: 0 };
}
victimStats[name].count += 1;
victimStats[name].marginSum += margin;
});

// Aggregate margin data for nemeses from fasterDetails.
const nemesisStats = {};
fasterDetails.forEach(({ name, margin }) => {
if (!nemesisStats[name]) {
  nemesisStats[name] = { count: 0, marginSum: 0 };
}
nemesisStats[name].count += 1;
nemesisStats[name].marginSum += margin;
});

// Prepare rows for the victims table.
const victimRows = Object.keys(victimStats)
// Only count competitors with at least 3 total races against the athlete.
.filter(name => (winLossStats[name]?.wins + winLossStats[name]?.losses) >= 2)
.map(name => {
  const athleteWins = winLossStats[name]?.wins || 0;    // races athlete won vs competitor
  const athleteLosses = winLossStats[name]?.losses || 0; // races athlete lost to competitor
  const total = athleteWins + athleteLosses;
  const winPct = total ? Math.round((athleteWins / total) * 100) : 0;
  const avgMargin = Math.round(victimStats[name].marginSum / victimStats[name].count);
  return { name, wins: athleteWins, losses: athleteLosses, winPct, avgMargin };
})
// Ensure the athlete has a winning record and margin is <= 200s.
.filter(row => row.wins > row.losses && row.avgMargin < 200)
// Sort in ascending order so the closest (smallest avg margin) come first.
.sort((a, b) => a.avgMargin - b.avgMargin)
.slice(0, 5);

// Prepare rows for the nemeses table.
const nemesisRows = Object.keys(nemesisStats)
.filter(name => (winLossStats[name]?.wins + winLossStats[name]?.losses) >= 2)
.map(name => {
  const athleteWins = winLossStats[name]?.wins || 0;    // races athlete won against competitor
  const athleteLosses = winLossStats[name]?.losses || 0; // races athlete lost to competitor
  const total = athleteWins + athleteLosses;
  const winPct = total ? Math.round((athleteWins / total) * 100) : 0;
  const avgMargin = Math.round(nemesisStats[name].marginSum / nemesisStats[name].count);
  return { name, wins: athleteWins, losses: athleteLosses, winPct, avgMargin };
})
// Ensure the athlete has a losing record and margin is <= 200s.
.filter(row => row.losses > row.wins && row.avgMargin <= 200)
.sort((a, b) => a.avgMargin - b.avgMargin)
.slice(0, 5);

  // Compute additional overall performance stats.
  const totalRaces = validEnrichedResults.length;
  const bestRank = totalRaces ? Math.min(...validEnrichedResults.map(r => r.Overall_Rank)) : 'N/A';
  const worstRank = totalRaces ? Math.max(...validEnrichedResults.map(r => r.Overall_Rank)) : 'N/A';
  const avgRank = totalRaces ? (validEnrichedResults.reduce((sum, r) => sum + r.Overall_Rank, 0) / totalRaces).toFixed(1) : 'N/A';
  const finishTimes = validEnrichedResults.map(r => timeToSeconds(r.Total_Time)).filter(t => t);
  const timeByDistance = validEnrichedResults.reduce((acc, r) => {
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
  const avgFinishTimeByDistance = Object.entries(timeByDistance).map(
    ([distance, { sum, count }]) => ({
      distance,
      avgFinishTime: formatTime(sum / count)
    })
  );
console.log(nemesisRows)
  return (
    <div className="athlete-profile records-card" style={{ padding: '20px', margin: '20px auto', maxWidth: '900px' }}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>General Stats</h2>
      
      {/* Overall Performance Summary */}
      <div className="stats-section" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        <h3 style={{ marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>Overall Performance</h3>
        <div className="record-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Total Races:</span>
          <span>{finishBreakdown.Finished}</span>
        </div>
        <div className="record-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Best Rank:</span>
          <span>{bestRank}</span>
        </div>
        <div className="record-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Worst Rank:</span>
          <span>{worstRank}</span>
        </div>
        <div className="record-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Average Rank:</span>
          <span>{avgRank}</span>
        </div>
        <div>
          <div className="record-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Average Finish Time:</span>
          </div>
          {avgFinishTimeByDistance.map(({ distance, avgFinishTime }) => (
            <div
              className="record-item"
              key={distance}
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', marginLeft:'20px' }}
            >
              <span>{distance}</span>
              <span>{avgFinishTime}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Finish Breakdown Section */}
      <div className="record-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>Finish Breakdown</h3>
        <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
          {Object.entries(finishBreakdown).map(([k, v]) => (
            <li key={k} style={{ marginBottom: '4px' }}><strong>{k}:</strong> {v}</li>
          ))}
        </ul>
      </div>

      {/* Nemeses Table */}
      <div className="record-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>Top Nemeses</h3>
        {nemesisRows.length > 0 ? (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Nemeses</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win%</th>
                <th>Margin (s)</th>
              </tr>
            </thead>
            <tbody>
              {nemesisRows.map(row => (
                <tr key={row.name}>
                    {/* <Link to={`/athlete/${row.id}`}> */}
                    <td> {row.name} {/* </Link> */ } </td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.winPct}%</td>
                  <td>{row.avgMargin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No nemeses found.</p>}
      </div>

      {/* Victims Table */}
      <div className="record-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>Top Victims</h3>
        {victimRows.length > 0 ? (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Victims</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win%</th>
                <th>Margin (s)</th>
              </tr>
            </thead>
            <tbody>
              {victimRows.map(row => (
                <tr key={row.name}>
                    {/* <Link to={`/athlete/${row.id}`}> */}
                    <td> {row.name} {/* </Link> */ } </td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.winPct}%</td>
                  <td>{row.avgMargin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No victims found.</p>}
      </div>

      {/* Races per Year Section */}
      <div className="record-section">
        <h3 style={{ marginBottom: '10px' }}>Races per Year</h3>
        <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
          {Object.entries(validEnrichedResults.reduce((acc, r) => {
              const year = new Date(r.Date).getFullYear();
              acc[year] = (acc[year] || 0) + 1;
              return acc;
            }, {}))
            .sort((a, b) => b[0] - a[0])
            .map(([year, count]) => (
              <li key={year} style={{ marginBottom: '4px' }}><strong>{year}:</strong> {count}</li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default GeneralStats;
