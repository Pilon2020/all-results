import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Athlete from './components/Athlete';
import Race from './components/Race';
import MoreResults from './components/MoreSearch';
import Analysis from './components/AthleteRace';
import Header from './components/Header';
import Signup from './components/signup';
import SignIn from './components/SignIn';
import Profile from './components/Profile';

import './App.css';

function App() {
  const location = useLocation();

  return (
    <div className="App">
      {/* Conditionally render Header */}
      {location.pathname !== "/" && <Header />}

      <Routes>
        {/* Default route */}
        <Route path="/" element={<Home />} />

        {/* Dynamic routes for athlete and race pages */}
        <Route path="/race/:id" element={<Race />} />
        <Route path="/athlete/:id" element={<Athlete />} />
        <Route path="/search/:id" element={<MoreResults />} />
        <Route path="/analysis/:id1/:id2" element={<Analysis />} />
        <Route path="/SignUp" element={<Signup />} />
        <Route path="/Profile" element={<Profile />} /> {/* Profile Page */}
        <Route path="/SignIn" element={<SignIn />} /> {/* Sign In Page */}
      </Routes>
    </div>
  );
}

export default App;