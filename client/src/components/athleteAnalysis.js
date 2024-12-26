import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SimpleChart from './SimpleChart';

function AthleteAnalysis({ athlete, RaceResults}) {
  const { id } = useParams();
  const [athleteState, setAthleteState] = useState(null);
  const [raceResults, setRaceResults] = useState(RaceResults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAthleteDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/athleteInfo?_id=${id}`);
        if (response.ok) {
          const data = await response.json();
          const foundAthlete = data.find(athlete => athlete._id.toString() === id);
          if (foundAthlete) {
            setAthleteState(foundAthlete);
          } else {
            setError("Athlete not found.");
          }
        } else {
          setError("Failed to fetch athlete details.");
        }

        const raceResultsResponse = await fetch(`http://localhost:5000/api/raceResults?Athlete_id=${id}`);
        if (raceResultsResponse.ok) {
          const raceResultsData = await raceResultsResponse.json();
          setRaceResults(raceResultsData);
        } else {
          setError("Failed to fetch race results.");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Error fetching athlete or race results.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAthleteDetails();
    }
  }, [id]);
  
  const labels = ["January", "February", "March", "April", "May", "June"];

  const data = {
    labels: labels,
    datasets: [
      {
        label: "My First dataset",
        backgroundColor: "rgb(255, 99, 132)",
        borderColor: "rgb(255, 99, 132)",
        data: [0, 10, 5, 2, 20, 30, 45],
      },
    ],
  };


  return (
    <div style={{ border: '3px solid #ccc', borderTop: 'none', borderRadius: '0px 0px 10px 10px' }}>
      <div style={{ padding: '10px' }} className='body'>
        <h2 style={{ paddingBottom: '0px' }}>Analysis</h2>
        <p>Perform advanced analysis for {athlete?.Name}.</p>
        <SimpleChart />
      </div>
    </div>
  );
}

export default AthleteAnalysis;
