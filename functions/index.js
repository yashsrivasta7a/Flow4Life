const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.sendChatNotification = functions.database
  .ref("/messages/{chatId}/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val();
    const { chatId, messageId } = context.params;

    if (!message || !message.sender) return null;

    try {
      // Fetch chat data to find recipient
      const chatSnapshot = await admin.database().ref(`/chats/${chatId}`).once("value");
      const chat = chatSnapshot.val();

      if (!chat || !chat.participants) return null;

      // Extract participant IDs and find recipient (not sender)
      const participants = Object.values(chat.participants); // Ensure it's an array
      const recipientId = participants.find((id) => id !== message.sender);
      if (!recipientId) return null;

      // Get recipient's data including FCM token
      const recipientSnapshot = await admin.database().ref(`/users/${recipientId}`).once("value");
      const recipient = recipientSnapshot.val();
      if (!recipient || !recipient.fcmToken) return null;

      // Get sender's data for better notification display
      const senderSnapshot = await admin.database().ref(`/users/${message.sender}`).once("value");
      const sender = senderSnapshot.val();
      const senderName = message.senderName || sender?.displayName || sender?.name || "Someone";

      // Get chat title or recipient name for notification
      const chatTitle = chat.title || (chat.type === 'blood_request' ? 'Blood Request Chat' : 'Chat');

      // Build the notification payload
      const payload = {
        notification: {
          title: `${senderName} (${chatTitle})`,
          body: message.text
            ? message.text.length > 100
              ? `${message.text.substring(0, 97)}...`
              : message.text
            : "New message",
          icon: '/blood.png',
          badge: '/blood.png',
          click_action: `https://${process.env.GCLOUD_PROJECT}.web.app/chats/${chatId}`,
          tag: `chat_${chatId}`, // Group notifications from the same chat
          renotify: true, // Always notify even if there's an existing notification
        },
        data: {
          type: 'chat',
          chatId: chatId,
          messageId: messageId,
          senderId: message.sender,
          senderName: senderName,
          timestamp: message.timestamp?.toString() || Date.now().toString(),
        },
        webpush: {
          notification: {
            requireInteraction: true,
            actions: [
              {
                action: 'reply',
                title: 'Reply'
              },
              {
                action: 'open',
                title: 'Open Chat'
              }
            ]
          },
          fcmOptions: {
            link: `https://${process.env.GCLOUD_PROJECT}.web.app/chats/${chatId}`
          }
        }
      };    try {
      // Send the notification
      const response = await admin.messaging().sendToDevice(recipient.fcmToken, payload);
      
      // Log results
      response.results.forEach((result, index) => {
        if (result.error) {
          console.error('Error sending notification:', result.error);
          // If the token is no longer valid, remove it
          if (result.error.code === 'messaging/invalid-registration-token' ||
              result.error.code === 'messaging/registration-token-not-registered') {
            admin.database().ref(`/users/${recipientId}/fcmToken`).remove();
          }
        }
      });

      // Update chat status
      await Promise.all([
        // Mark message as sent
        admin.database().ref(`/messages/${chatId}/${messageId}/status`).set('sent'),
        
        // Update unread status in recipient's chat list
        admin.database().ref(`/userChats/${recipientId}/${chatId}`).update({
          unread: true,
          lastMessage: message.text,
          timestamp: admin.database.ServerValue.TIMESTAMP
        })
      ]);

      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  });
