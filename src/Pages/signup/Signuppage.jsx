import React, { useState } from 'react';
import blood from '../../assets/blood.png'
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, signInWithPopup, createUserWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import { app } from "../../Utils/Firebase";
import "./Signuppage.css";
import Navbar from '../../components/Navbar';

const Signuppage = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const Google = new GoogleAuthProvider();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorUsername, setErrorUsername] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorConfirmPassword, setErrorConfirmPassword] = useState('');

  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Validation functions
  const validateUsername = (value) => {
    if (value.length >= 4) {
      setErrorUsername('');
    } else {
      setErrorUsername('Username must be at least 4 characters long');
    }
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      setErrorEmail('');
    } else {
      setErrorEmail('Enter a valid email address');
    }
  };

  const validatePassword = (value) => {
    if (value.length >= 6) {
      setErrorPassword('');
    } else {
      setErrorPassword('Password must be at least 6 characters long');
    }
  };

  const validateConfirmPassword = (value) => {
    if (value === password && value.length >= 6) {
      setErrorConfirmPassword('');
    } else {
      setErrorConfirmPassword('Passwords do not match');
    }
  };

  // Input change handler with field-specific validation
  const handleInputChange = (setter, validator) => (e) => {
    const value = e.target.value;
    setter(value);
    if (validator) validator(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !errorUsername &&
      !errorEmail &&
      !errorPassword &&
      !errorConfirmPassword &&
      username &&
      email &&
      password &&
      confirmPassword
    ) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created:', userCredential.user);
        navigate('/'); // Navigate to home or another page
      } catch (error) {
        console.error('Error creating user:', error.message);
      }
    }
  };

  const signupWithGoogle = async () => {
      try {
        const result = await signInWithPopup(auth, Google);
        console.log("User signed in with Google:", result.user);
        navigate('/');
      } catch (error) {
        console.error("Error signing in with Google:", error.message);
      }
    };

  return (
    <>
      <Navbar
        user={user}
        onLogout={() => {}}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <div className='page-container'>
        <div className="form-container">
          <div className="header">
            <h1 className='app-name'>Flow4Life</h1>
            <div className='header'>
              <img src={blood} alt="Blood Donation Logo" />
            </div>
            <h2 className='form-title'>Sign Up</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                placeholder='User name'
                className={`input-field ${errorUsername ? 'border-red-500 bg-red-100' : 'border-white-500 bg-white-100'}`}
                value={username}
                onChange={handleInputChange(setUsername, validateUsername)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorUsername}</p>

              <input
                type="text"
                placeholder='Email'
                className={`input-field ${errorEmail ? 'border-red-500 bg-red-100' : 'border-white-500 bg-white-100'}`}
                value={email}
                onChange={handleInputChange(setEmail, validateEmail)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorEmail}</p>

              <input
                type="password"
                placeholder='Password'
                className={`input-field ${errorPassword ? 'border-red-500 bg-red-100' :'border-white-500 bg-white-100'}`}
                value={password}
                onChange={handleInputChange(setPassword, validatePassword)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorPassword}</p>

              <input
                type="password"
                placeholder='Confirm password'
                className={`input-field ${errorConfirmPassword ? 'border-red-500 bg-red-100' : 'border-white-500 bg-white-100'}`}
                value={confirmPassword}
                onChange={handleInputChange(setConfirmPassword, validateConfirmPassword)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorConfirmPassword}</p>
            </div>
            <div className="form-options">
              <label>
                <input type="checkbox" className='checkbox' />Remember me
              </label>
              
            </div>
            <button type='submit' className='submitbutton'>Create account</button>
          </form>
          <button className='submitbutton2' onClick={signupWithGoogle}>Sign in with Google</button>
          <p className='footer-text'>
            Already Have an account?{" "}
            <Link to="/signin">Sign In</Link> {/* Navigate to sign-in page */}
          </p>
        </div>
      </div>
    </>
  );
};

export default Signuppage;
