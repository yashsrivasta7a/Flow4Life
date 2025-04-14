import axios from "axios";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert("path/to/your-service-account-key.json"), // Replace with your service account key file
  });
}

export const sendNotification = async (req, res) => {
  const { deviceToken, title, body } = req.body;

  try {
    await admin.messaging().send({
      token: deviceToken,
      notification: {
        title,
        body,
      },
    });
    res.status(200).send({ success: true, message: "Notification sent successfully." });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).send({ success: false, message: "Failed to send notification." });
  }
};

const sendNotificationLegacy = async (deviceToken, title, body, serverKey) => {
  const fcmUrl = "https://fcm.googleapis.com/fcm/send";
  try {
    const response = await axios.post(
      fcmUrl,
      {
        to: deviceToken,
        notification: {
          title,
          body,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`, // Use the provided server key
        },
      }
    );
    console.log(`Notification sent successfully: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error(
      `Error sending notification: ${error.response?.data || error.message}`
    );
  }
};

export default sendNotificationLegacy;
