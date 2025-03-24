import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchComponent from './SearchComponent';
import '../App.css'; // Make sure the CSS file is imported

function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <header className="Header">
        <div className="header-content">
          <a href="/" className="headerlink">
            <h1>ALL RESULTS</h1>
          </a>
          <Link to="/signin" className="SignIn">
            Sign In
          </Link>
        </div>
      </header>
      <main className="Home" style={{ marginTop: '60px', padding: '20px' }}>
        <div className="search-container">
          <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        {/* Other Home page content */}
      </main>
    </div>
  );
}

export default Home;
