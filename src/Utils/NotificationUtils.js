import { getDatabase, ref, get } from "firebase/database";
import axios from "axios";

export const sendNotification = async (userId, title, body) => {
  const db = getDatabase();
  const userRef = ref(db, `users/${userId}/fcmToken`);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    const deviceToken = snapshot.val();

    try {
      // Call your server endpoint to send the notification
      await axios.post("/api/send-notification", {
        deviceToken,
        title,
        body,
      });
      console.log("Notification sent successfully.");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  } else {
    console.error("FCM token not found for user:", userId);
  }
};
