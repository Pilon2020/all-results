import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function Race() {
  const { id } = useParams();
  const [race, setRace] = useState([]);
  const [athlete, setAthlete] = useState(null);
  const [raceResults, setRaceResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('raceResults');
  const [showAllYears, setShowAllYears] = useState(false);


  useEffect(()=>{
    const fetchRaceData = async () => {
      try {
        const athleteRes = await fetch(`http://localhost:5000/api/athleteInfo?id=${id}`);
        if (!athleteRes.ok) throw new Error("Failed to fetch athlete profile");
        const athleteData = await athleteRes.json();
        setAthlete(athleteData);

        const resultsRes = await fetch(`http://localhost:5000/api/results`);
        if (!resultsRes.ok) throw new Error("Failed to fetch race results");
        const resultsData = await resultsRes.json();

        // Filter raceResults by participant ID match
        const participantIDs = new Set(athleteData.participants || []);
        const filteredResults = resultsData.filter(r => participantIDs.has(r.Participant_ID));
        setRaceResults(filteredResults);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRaceData();
  }, [id]);

  // Fetch race details using the `id` if needed
  return (
    <div className="content"> 
      <h2>Race Details</h2>
      <p>Race ID: {id}</p>
      {/* Add details based on fetched data */}
    </div>
  );
}

export default Race;
