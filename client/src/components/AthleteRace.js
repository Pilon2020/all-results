import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const RaceInfo = () => {
  const { race_id, result_id } = useParams();
  const [enrichedResult, setEnrichedResult] = useState(null);
  const [matchingResults, setMatchingResults] = useState([]);
  const [splitRanks, setSplitRanks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resultRes, raceRes, participantsRes] = await Promise.all([
          fetch(`http://localhost:5050/api/result/${result_id}`),
          fetch(`http://localhost:5050/api/race/${race_id}`),
          fetch(`http://localhost:5050/api/participants`)
        ]);

        if (!resultRes.ok || !raceRes.ok || !participantsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const resultData = await resultRes.json();
        const raceData = await raceRes.json();
        const participantsData = await participantsRes.json();

        const participantData = participantsData.find(p => p.Participant_ID === resultData.Participant_ID);
        const athleteDistance = participantData?.Distance || resultData.Distance || 'Unknown';

        const sameRaceParticipants = participantsData.filter(
          (p) => String(p.Race_ID) === String(raceData.Race_ID)
        );

        const matchingParticipants = sameRaceParticipants.filter(
          (p) => String(p.Distance).toLowerCase() === String(athleteDistance).toLowerCase()
        );

        const participantIDs = matchingParticipants.map(p => p.Participant_ID);
        const resultsRes = await fetch('http://localhost:5050/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_ids: participantIDs }),
        });

        if (!resultsRes.ok) {
          throw new Error('Failed to fetch matching results');
        }

        const resultList = await resultsRes.json();
        setMatchingResults(resultList);

        const enriched = {
          ...resultData,
          Race: raceData.Name || 'Unknown Race',
          Location: raceData.Location || 'Unknown',
          Date: raceData.Date || 'Unknown',
          Distance: athleteDistance,
          swimDistance: raceData.Swim_Distance || 0,
          bikeDistance: raceData.Bike_Distance || 0,
          runDistance: raceData.Run_Distance || 0,
          totalDistance: raceData.Total_Distance || 0,
          draftLegal: raceData.Draft_Legal || false,
        };

        setEnrichedResult(enriched);

        const parseTime = (timeStr) => {
          if (!timeStr) return Infinity;
          const [hh, mm, ss] = timeStr.split(':').map(Number);
          return (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
        };

        const formatTime = (totalSeconds) => {
          if (!isFinite(totalSeconds)) return 'N/A';
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
        };

        const computeRank = (targetId, results, key) => {
          const sorted = [...results].filter(r => r[key]).sort((a, b) => parseTime(a[key]) - parseTime(b[key]));
          return sorted.findIndex(r => r.Participant_ID === targetId) + 1;
        };

        const participantMap = new Map();
        participantsData.forEach(p => {
          participantMap.set(p.Participant_ID, p);
        });

        resultList.forEach(r => {
          const match = participantMap.get(r.Participant_ID);
          if (match) {
            r.Gender = match.Gender;
            r.Age_Group = match.Age_Group;
          }
        });

        const computeSplitRanks = () => {
          const targetId = resultData.Participant_ID;
          const gender = participantData?.Gender?.toString().trim().toLowerCase();
          const ageGroupRaw = participantData?.Age_Group;
          const isCollegiate = typeof ageGroupRaw === 'string' && ageGroupRaw.toLowerCase().includes('collegiate');
          const normalizedAgeGroup = isCollegiate ? 'collegiate' : Number(ageGroupRaw);

          const normalizeAgeGroup = (val) => {
            if (typeof val === 'string' && val.toLowerCase().includes('collegiate')) return 'collegiate';
            return Number(val);
          };

          const splits = [
            { key: 'Swim_Time', label: 'Swim' },
            { key: 'T1_Time', label: 'T1' },
            { key: 'Bike_Time', label: 'Bike' },
            { key: 'T2_Time', label: 'T2' },
            { key: 'Run_Time', label: 'Run' }
          ];

          let cumulativeSeconds = 0;

          const rows = splits.map(({ key, label }) => {
            const splitSeconds = parseTime(resultData[key]);
            cumulativeSeconds += isFinite(splitSeconds) ? splitSeconds : 0;

            const allWithKey = resultList.filter(r => r[key]);
            const genderFiltered = allWithKey.filter(r => r.Gender?.toString().trim().toLowerCase() === gender);
            const ageGroupFiltered = allWithKey.filter(r => normalizeAgeGroup(r.Age_Group) === normalizedAgeGroup);

            const overallRank = computeRank(targetId, allWithKey, key);
            const genderRank = computeRank(targetId, genderFiltered, key);
            const ageGroupRank = computeRank(targetId, ageGroupFiltered, key);

            return {
              split: label,
              time: resultData[key] || 'N/A',
              splitOverallRank: overallRank || '-',
              splitGenderRank: genderRank || '-',
              splitAgeGroupRank: ageGroupRank || '-',
              overallTime: formatTime(cumulativeSeconds),
              overallRank: overallRank || '-',
              genderRank: genderRank || '-',
              ageGroupRank: ageGroupRank || '-',
            };
          });

          const allWithTotal = resultList.filter(r => r.Total_Time);
          const genderTotal = allWithTotal.filter(r => r.Gender?.toString().trim().toLowerCase() === gender);
          const ageGroupTotal = allWithTotal.filter(r => normalizeAgeGroup(r.Age_Group) === normalizedAgeGroup);

          const totalOverallRank = computeRank(targetId, allWithTotal, 'Total_Time');
          const totalGenderRank = computeRank(targetId, genderTotal, 'Total_Time');
          const totalAgeGroupRank = computeRank(targetId, ageGroupTotal, 'Total_Time');

          rows.push({
            split: 'Total',
            time: resultData.Total_Time || 'N/A',
            splitOverallRank: totalOverallRank || '-',
            splitGenderRank: totalGenderRank || '-',
            splitAgeGroupRank: totalAgeGroupRank || '-',
            overallTime: resultData.Total_Time || 'N/A',
            overallRank: totalOverallRank || '-',
            genderRank: totalGenderRank || '-',
            ageGroupRank: totalAgeGroupRank || '-',
          });

          return rows;
        };

        const ranks = computeSplitRanks();
        setSplitRanks(ranks);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    if (race_id && result_id) {
      fetchData();
    }
  }, [race_id, result_id]);

  if (!enrichedResult) {
    return <p style={{ padding: '20px' }}>Loading race data...</p>;
  }

  const quickFactStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px',
    padding: '20px 0'
  };

  const factBox = {
    flex: '1 0 140px',
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '6px',
    boxShadow: '0 0 5px rgba(0,0,0,0.1)',
    textAlign: 'center'
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>{enrichedResult['First Name']} {enrichedResult['Last Name']} - {enrichedResult.Race} {new Date(enrichedResult.Date).getFullYear()}</h1>

      {/* Quick Facts Section */}
      <div style={quickFactStyle}>
        <div style={factBox}>
          <div><strong>{enrichedResult.overallRank}/{enrichedResult.genderRank}/{enrichedResult.ageGroupRank}</strong></div>
          <div style={{ fontSize: '13px' }}>All/Gender/AG</div>
        </div>
        <div style={factBox}>
          <div><strong>{enrichedResult.Age_Group}</strong></div>
          <div style={{ fontSize: '13px' }}>Age group</div>
        </div>
        <div style={factBox}>
          <div><strong>{enrichedResult.Bib_Number || enrichedResult.Bib}</strong></div>
          <div style={{ fontSize: '13px' }}>Bib number</div>
        </div>
        <div style={factBox}>
          <div><strong>{enrichedResult.Country || 'USA'}</strong></div>
          <div style={{ fontSize: '13px' }}>Nationality</div>
        </div>
      </div>

      {/* Top Split Summary */}
      <table style={{ width: '100%', textAlign: 'center', backgroundColor: '#fff', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            {splitRanks.slice(0, 5).map(s => (
              <th key={s.split} style={{ padding: '10px', fontSize: '14px' }}>{s.split}</th>
            ))}
            <th style={{ padding: '10px', fontSize: '14px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {splitRanks.slice(0, 5).map(s => (
              <td key={s.split} style={{ padding: '10px', fontWeight: 'bold' }}>{s.time}</td>
            ))}
            <td style={{ padding: '10px', fontWeight: 'bold' }}>{enrichedResult.Total_Time}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ fontSize: '18px', margin: '20px 0 5px' }}>Detailed Split Table</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Split</th>
            <th style={{ textAlign: 'right' }}>Split Time</th>
            <th style={{ textAlign: 'right' }}>Split Overall Rank</th>
            <th style={{ textAlign: 'right' }}>Split Gender Rank</th>
            <th style={{ textAlign: 'right' }}>Split Age Group Rank</th>
            <th style={{ textAlign: 'right' }}>Overall Time</th>
            <th style={{ textAlign: 'right' }}>Overall Rank</th>
            <th style={{ textAlign: 'right' }}>Gender Rank</th>
            <th style={{ textAlign: 'right' }}>Age Group Rank</th>
          </tr>
        </thead>
        <tbody>
          {splitRanks.map((s, idx) => (
            <tr key={idx}>
              <td>{s.split}</td>
              <td style={{ textAlign: 'right' }}>{s.time}</td>
              <td style={{ textAlign: 'right' }}>{s.splitOverallRank}</td>
              <td style={{ textAlign: 'right' }}>{s.splitGenderRank}</td>
              <td style={{ textAlign: 'right' }}>{s.splitAgeGroupRank}</td>
              <td style={{ textAlign: 'right' }}>{s.overallTime}</td>
              <td style={{ textAlign: 'right' }}>{s.overallRank}</td>
              <td style={{ textAlign: 'right' }}>{s.genderRank}</td>
              <td style={{ textAlign: 'right' }}>{s.ageGroupRank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RaceInfo;
