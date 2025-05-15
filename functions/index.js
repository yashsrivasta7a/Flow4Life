const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.sendChatNotification = functions.database
  .ref("/messages/{chatId}/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val();
    const chatId = context.params.chatId;

    if (!message || !message.sender) return null;

    // Fetch chat data to find recipient
    const chatSnapshot = await admin.database().ref(`/chats/${chatId}`).once("value");
    const chat = chatSnapshot.val();

    if (!chat || !chat.participants) return null;

    // Extract participant IDs and find recipient (not sender)
    const participants = Object.values(chat.participants); // Ensure it's an array
    const recipientId = participants.find((id) => id !== message.sender);
    if (!recipientId) return null;

    // Get recipient's FCM token
    const tokenSnapshot = await admin.database().ref(`/users/${recipientId}/fcmToken`).once("value");
    const token = tokenSnapshot.val();
    if (!token) return null;

    // Build the notification payload
    const payload = {
      notification: {
        title: `New message from ${message.senderName || "Someone"}`,
        body: message.text
          ? message.text.length > 100
            ? `${message.text.substring(0, 97)}...`
            : message.text
          : "You have a new message",
        click_action: "OPEN_CHAT_ACTIVITY",
      },
      data: {
        chatId: chatId,
        senderId: message.sender,
      },
    };

    try {
      await admin.messaging().sendToDevice(token, payload);
      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  });
