import { useState, useEffect } from "react";
import { getDatabase, ref, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import blood from "../../assets/blood.png";
import "../signin/Signinpage.css";
import Navbar from '../../components/Navbar';

const ProfileSetup = () => {
    const auth = getAuth();
    // const user = auth.currentUser;
    const db = getDatabase();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [bloodGroup, setBloodGroup] = useState("");
    const [location, setLocation] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                navigate("/signin"); 
            }
        });

        return () => unsubscribe();
    }, [auth, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault(); 

        if (!user) {
            console.log("User not logged in!");
            return;
        }

        try {
            const userRef = ref(db, `users/${user.uid}`);
            await update(userRef, { bloodGroup, location });
            console.log("Profile updated!");
            navigate("/"); 
        } catch (error) {
            console.error("Error updating profile:", error.message);
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
            <div className='page-container pt-20'>
                <div className="form-container">
                    <div className="header">
                        <h1 className='app-name'>Flow4Life</h1>
                        <div className='header'>
                            <img src={blood} alt="Blood Donation Logo" />
                        </div>
                        <h2 className='form-title'>Profile Setup</h2>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder='Blood Group'
                                value={bloodGroup}
                                onChange={(e) => setBloodGroup(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>
                        <button type='submit' className='submitbutton'>
                            Complete Your Profile
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};
export default ProfileSetup;