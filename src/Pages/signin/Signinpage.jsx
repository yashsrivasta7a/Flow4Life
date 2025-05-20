import React, { useState } from 'react';
import blood from "../../assets/blood.png";
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";
import { app } from "../../Utils/Firebase";
import "./Signinpage.css";
import Navbar from '../../components/Navbar';

const Signinpage = () => {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const Google = new GoogleAuthProvider();
  const db = getDatabase(app);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Function to check if the user's profile is complete
  const checkUserProfile = async (user) => {
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists() && snapshot.val().bloodGroup) {
      navigate('/'); // Redirect to home if profile is complete
    } else {
      navigate('/profilesetup'); 
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || errorEmail || errorPassword) return;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      navigate("/")
      checkUserProfile(user);
    } catch (error) {
      console.error('Error signing in:', error.message);
    }
  };

  // Handle Sign-in with Google
  const signupWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, Google);
      const user = result.user;

      // Check if user already exists in database
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        // Save user data if they are signing in for the first time
        await set(userRef, {
          email: user.email,
          name: user.displayName || "Anonymous",
          profilePicture: user.photoURL || "",
          uid: user.uid
        });
      }

      checkUserProfile(user);
    } catch (error) {
      console.error("Error signing in with Google:", error.message);
    }
  };

  return (
    <>
      {/* <Navbar
        user={user}
        onLogout={() => {}}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      /> */}
      <div className='page-container'>
        <div className="form-container">
          <div className="header">
            <h1 className='app-name'>Flow4Life</h1>
            <div className='header'>
              <img src={blood} alt="Blood Donation Logo" />
            </div>
            <h2 className='form-title'>Sign In</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                placeholder='Email'
                className={`input-field ${errorEmail ? 'border-red-500 bg-red-100' : 'border-white-500 bg-white-100'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorEmail}</p>

              <input
                type="password"
                placeholder='Password'
                className={`input-field ${errorPassword ? 'border-red-500 bg-red-100' : 'border-white-500 bg-white-100'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className='text-red-500 text-sm text-left pl-1'>{errorPassword}</p>
            </div>

            <div className="form-options">
              <label>
                <input type="checkbox" className='checkbox' />Remember me
              </label>
              <a href="#" className='forgot'>Forgot Password?</a>
            </div>
            <button type='submit' className='submitbutton'>Login</button>
          </form>
          <button className='submitbutton2' onClick={signupWithGoogle}>Sign in with Google</button>
          <p className='footer-text'>
            Don’t Have an account?{" "}
            <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Signinpage;
