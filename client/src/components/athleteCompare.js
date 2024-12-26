import React from 'react';

function athleteCompare({ athlete, raceResults }) {
  return (
    <div style={{ border: '3px solid #ccc',borderTop: 'none', borderRadius:'0px 0px 10px 10px'}}>
      <div className='body'
      style={{padding: '10px' }}>
      <h2>Compare</h2>
      <p>Compare {athlete.Name} with others.</p>
      {/* Add comparison logic here */}
      </div>
    </div>
  );
}

export default athleteCompare;
