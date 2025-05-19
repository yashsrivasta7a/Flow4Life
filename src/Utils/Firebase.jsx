import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";


const firebaseConfig = {
  apiKey: "AIzaSyD_9kApMf_AotAlYwvSmgY_hd9cOaFsWx0",
  authDomain: "flow4life.firebaseapp.com",
  projectId: "flow4life",
  storageBucket: "flow4life.firebasestorage.app",
  messagingSenderId: "360337861795",
  appId: "1:360337861795:web:1eace881dd5ef5c0762316",
  measurementId: "G-RCKYFN5NER",
  databaseURL:"https://flow4life-default-rtdb.firebaseio.com/"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const messaging = getMessaging(app);

// Request permission and get the token
export const requestMessagingPermissionAndToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // Replace with your actual VAPID key from Firebase Console
      });
      if (currentToken) {
        // Save the token to the user's profile in the database
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userRef = ref(database, `users/${userId}`);
          await update(userRef, {
            fcmToken: currentToken
          });
        }
        return currentToken;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting messaging token:', error);
    return null;
  }
};




