import React from 'react';

function Stats({ athlete, raceResults }) {
  return (
    <div style={{ border: '3px solid #ccc',borderTop: 'none', borderRadius:'0px 0px 10px 10px'}}>
      <div style={{padding: '10px' }}
          className='body'>
      <h2>Stats</h2>
      <p>View stats for {athlete.Name}.</p>
      {/* Add stats logic here */}
      </div>
    </div>
  );
}

export default Stats;
