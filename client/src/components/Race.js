import React from 'react';
import { useParams } from 'react-router-dom';

function Race() {
  const { id } = useParams();

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
