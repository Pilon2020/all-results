import React, { useState } from 'react';

function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    month: '',
    day: '',
    year: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [emailDisplay, setEmailDisplay] = useState(''); // For showing user input as-is
  const [emailError, setEmailError] = useState('');
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    specialChar: false,
    number: false,
    capital: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setEmailDisplay(value); // Display email as entered
      const emailValue = value.toLowerCase(); // Store email as lowercase
      setFormData((prev) => ({ ...prev, [name]: emailValue }));
      validateEmail(emailValue);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation regex
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleEmailBlur = async () => {
    if (!emailError && formData.email) {
      try {
        const response = await fetch(`http://localhost:5050/api/signup?email=${formData.email}`);
        if (!response.ok) {
          throw new Error('Failed to check email');
        }
        const data = await response.json();
        if (data.isTaken) {
          setEmailError('Email is already in use');
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error('Error checking email:', err);
        setEmailError('Error checking email');
      }
    }
  };
  

  const validatePassword = (password) => {
    const validations = {
      length: password.length >= 8,
      specialChar: /[!@#$%^&*]/.test(password),
      number: /[0-9]/.test(password),
      capital: /[A-Z]/.test(password),
    };
    setPasswordValidations(validations);
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, password: value }));
    validatePassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (emailError) {
      setError('Please fix the email error');
      return;
    }

    try {
      const response = await fetch('http://localhost:5050/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error signing up. Please try again.');
    }
  };

  return (
    <div className='content'>
    <div className="SignUpContainer">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="firstName">First Name:</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="lastName">Last Name:</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="birthday">Birthday:</label>
        <div className="BirthdaySelectors">
          <select
            id="month"
            name="month"
            value={formData.month}
            onChange={handleInputChange}
            required
          >
            <option value="">Month</option>
            {months.map((monthName, index) => (
              <option key={index} value={index + 1}>{monthName}</option>
            ))}
          </select>
          <input
            type="text"
            id="day"
            name="day"
            value={formData.day}
            onChange={handleInputChange}
            placeholder="Day"
            required
          />
          <input
            type="text"
            id="year"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            placeholder="Year"
            required
          />
        </div>

        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={emailDisplay} // Use display state for visible input
          onChange={handleInputChange}
          onBlur={handleEmailBlur}
          required
        />
        {emailError && <p className="Error">{emailError}</p>}

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handlePasswordChange}
          required
        />
        <div className="PasswordRequirements">
          {!(
            passwordValidations.length &&
            passwordValidations.specialChar &&
            passwordValidations.number &&
            passwordValidations.capital
          ) && (
            <>
              <p style={{ color: passwordValidations.length ? 'green' : 'red', margin: '0px' }}>
                At least 8 characters
              </p>
              <p style={{ color: passwordValidations.specialChar ? 'green' : 'red', margin: '0px' }}>
                At least 1 special character (!@#$%^&*)
              </p>
              <p style={{ color: passwordValidations.number ? 'green' : 'red', margin: '0px' }}>
                At least 1 number
              </p>
              <p style={{ color: passwordValidations.capital ? 'green' : 'red', marginTop: '0px' }}>
                At least 1 capital letter
              </p>
            </>
          )}
        </div>

        <label htmlFor="confirmPassword">Confirm Password:</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
        />

        {error && <p className="Error">{error}</p>}
        {success && <p className="Success">{success}</p>}
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account?{' '}
        <a href="/signin" className="SignInLink">Sign In</a>
      </p>
    </div>
    </div>
  );
}

export default SignUp;
