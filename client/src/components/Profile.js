import React, { useEffect, useState } from 'react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token'); // Assume the token is stored in localStorage

  useEffect(() => {
    // Fetch the profile when the component mounts
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`, // Include the JWT token in the header
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfile(data.profile); // Set the profile data
      } catch (err) {
        setError(err.message);
      }
    };

    fetchProfile();
  }, [token]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <div>
        <strong>First Name:</strong> {profile.firstName}
      </div>
      <div>
        <strong>Last Name:</strong> {profile.lastName}
      </div>
      <div>
        <strong>Email:</strong> {profile.email}
      </div>
      <div>
        <strong>Birthday:</strong> {profile.birthday.month}/{profile.birthday.day}/{profile.birthday.year}
      </div>
    </div>
  );
};

export default Profile;
