import React from 'react';

function Stats({ athlete, raceResults }) {
  return (
    <div>
      <h2>Stats</h2>
      <p>View stats for {athlete.Name}.</p>
      {/* Add stats logic here */}
    </div>
  );
}

export default Stats;
