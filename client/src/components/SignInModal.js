import React, { useState } from 'react';

function SignInModal() {
  const [showModal, setShowModal] = useState(false);

  const toggleModal = () => setShowModal(!showModal);

  return (
    <>
      <button className="SignInButton" onClick={toggleModal}>
        Sign In
      </button>

      {/* Modal */}
      {showModal && (
        <div className="Modal">
          <div className="ModalContent">
            <h2>Sign In</h2>
            <form>
              <label htmlFor="email">Email:</label>
              <input type="email" id="email" name="email" required />

              <label htmlFor="password">Password:</label>
              <input type="password" id="password" name="password" required />

              <button type="submit">Sign In</button>
            </form>
            <p>
              Don't have an account?{' '}
              <a href="/signup" style={{color:"black"}}>
                Sign Up
              </a>
            </p>
            <button className="CloseButton" onClick={toggleModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SignInModal;
