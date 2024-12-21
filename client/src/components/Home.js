// Home.js
import React, { useState } from 'react';
import SearchComponent from './SearchComponent';

function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="Home">
      <div className="Header">
        <h1>ALL RESULTS</h1>
      </div>
      <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
  );
}

export default Home;
