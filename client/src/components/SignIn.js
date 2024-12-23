import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignIn() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch('http://localhost:5000/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
      console.log('API response:', data); // Debug log
  
      if (response.ok) {
        console.log('Token:', data.token); // Log token
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        navigate('/profile'); // Redirect to the profile page
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Error during sign-in:', err);
      setError('Error signing in. Please try again.');
    }
  };  

  return (
    <div className="SignUpContainer">
      <div>
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />

          <button type="submit">Sign In</button>
        </form>

        {error && <p className="Error">{error}</p>}

        <p>
          Don't have an account?{' '}
          <a href="/signup" style={{ color: 'black' }}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
