import React, { useState } from 'react';
import SearchComponent from './SearchComponent';
import SignInModal from './SignInModal'; // Import the new SignInModal component

function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <header className="Header">
        <h1>ALL RESULTS</h1>
        <button className="SignInButton">
        <a href='/signin'>Sign In</a>
        </button>
      </header>

      <div className="Home">
        <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>
    </div>
  );
}

export default Home;
