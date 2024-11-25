import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Athlete from './components/Athlete';
import Race from './components/Race';
import MoreResults from './components/MoreSearch';
import Analysis from './components/AthleteRace';
import Header from './components/Header'; // Import the Header component
import './App.css';

function App() {
  return (
    <div className="App">

      <Routes>
        {/* Default route */}
        <Route path="/" element={<Home />} />

        {/* Dynamic routes for athlete and race pages */}
        <Route path="/race/:id" element={<Race />} />
        <Route path="/athlete/:id" element={<Athlete />} />
        <Route path="/more-results" element={<MoreResults />} />
        <Route path="/analysis/:id" element={<Analysis />} />
      </Routes>
    </div>
  );
}

export default App;
