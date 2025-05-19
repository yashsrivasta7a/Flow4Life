import { EmailClient } from "@azure/communication-email";
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from './Firebase';

const connectionString = import.meta.env.VITE_COMMUNICATION_SERVICES_CONNECTION_STRING;
const client = new EmailClient(connectionString);

async function sendEmail(body, add) {
    console.log('Attempting to send email to:', add);
    const emailMessage = {
        senderAddress: "DoNotReply@d718c6b6-e8fb-4927-9631-85ded959af50.azurecomm.net",
        content: {
            subject: "Donor Request From Flow4life",
            plainText: "Hello world via email.",
            html: `
            <html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blood Donation Request</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        h2 {
            color: #d9534f;
        }
        p {
            font-size: 16px;
            color: #333333;
            line-height: 1.5;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin-top: 20px;
            background-color: #5cb85c;
            color: white;
            text-decoration: none;
            font-size: 16px;
            border-radius: 5px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Urgent: Blood Donation Needed!</h2>
        <p>Dear <strong>${body.donorName}</strong>,</p>
        <p>We hope you're doing well. We have an urgent request for blood donation in your area, and you are a perfect match to help save a life!</p>
        <p><strong>Blood Type Needed:</strong> ${body.bloodType}</p>
        <p><strong>Location:</strong> ${body.location}</p>
        <p><strong>Patient's Distress:</strong> ${body.patientDescription}</p>
        <p>If you are available and willing to donate, please RSVP as soon as possible by clicking the link below. Your contribution could make all the difference for someone in critical need.</p>
        <a href="http://localhost:5173/blood-requests" class="btn">RSVP Now</a>
        <p>Once you confirm your availability, we will provide you with further details to coordinate the donation.</p>
        <p>Thank you for being a hero and making a positive impact in someone's life today. Every donation counts, and your generosity is truly appreciated.</p>
        <p>Warm regards,</p>
        <p>The Flow4Life Team</p>
    </div>
    <div class="footer">
        <p>&copy; 2024 Flow4Life. All rights reserved.</p>
    </div>
</body>
</html>
            `,
        },
        recipients: {
            to: [{ address: `${add}`}],
        },
    };

    try {
        console.log('Sending email with Azure Communication Services');
        console.log('Connection string:', connectionString.substring(0, 20) + '...'); // Log first part of connection string
        const poller = await client.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        console.log('Email sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details
        });
        if (typeof window !== 'undefined') {
            // Show error to user if in browser
            alert('Failed to send email: ' + (error.message || 'Unknown error'));
        }
        throw error;
    }
}

async function checkAndSendMatchingRequests(newRequest) {
    try {
        console.log('Starting checkAndSendMatchingRequests with request:', newRequest);
        
        // Get all active donors with matching blood type
        // This should be looking in 'users' or 'donors' collection, not 'donation_requests'
        const donorsRef = ref(database, 'users');
        const donorsQuery = query(
            donorsRef,
            orderByChild('bloodType'),
            equalTo(newRequest.bloodType)
        );

        console.log('Querying donors with blood type:', newRequest.bloodType);
        const snapshot = await get(donorsQuery);

        const donors = snapshot.val();
        console.log('Raw donor data:', donors);
        
        if (!donors) {
            console.log('No donors found with matching blood type');
            return;
        }

        // Filter donors by location and send emails
        for (const [donorId, donorData] of Object.entries(donors)) {
            console.log('Processing donor:', donorId, donorData);
            
            // Check if donor has city data
            if (!donorData.city) {
                console.log('Donor has no city information, skipping');
                continue;
            }
            
            console.log('Donor city:', donorData.city, 'Request city:', newRequest.city);
            
            // Check if donor is available - Check user's donation_status if exists
            const donorStatusRef = ref(database, `donation_requests/${donorId}`);
            const donorStatusSnapshot = await get(donorStatusRef);
            const donorStatus = donorStatusSnapshot.exists() ? 
                donorStatusSnapshot.val().status : 'available';
            
            console.log('Donor status:', donorStatus);
            
            // Ensure we have donor's email
            const donorEmail = donorData.email;
            console.log('Donor email:', donorEmail);

            if (
                donorData.city &&
                donorData.city.toLowerCase() === newRequest.city.toLowerCase() &&
                donorStatus === 'available' &&
                donorEmail
            ) {
                console.log('Found matching donor, sending email to:', donorEmail);
                const emailBody = {
                    donorName: donorData.displayName || donorData.name || 'Donor',
                    bloodType: newRequest.bloodType,
                    location: newRequest.hospital,
                    patientDescription: newRequest.additionalInfo || 'Urgent need for blood donation',
                    contact: newRequest.contactNumber
                };

                try {
                    console.log('Attempting to send email with body:', emailBody);
                    await sendEmail(emailBody, donorEmail);
                    console.log('Email sent successfully to:', donorEmail);
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                    console.error('Error details:', {
                        message: emailError.message,
                        code: emailError.code,
                        statusCode: emailError.statusCode,
                        details: emailError.details
                    });
                }
            } else {
                console.log('Skipping donor due to conditions:', {
                    hasCity: !!donorData.city,
                    cityMatch: donorData.city?.toLowerCase() === newRequest.city?.toLowerCase(),
                    status: donorStatus,
                    hasEmail: !!donorEmail
                });
            }
        }
    } catch (error) {
        console.error('Error in checkAndSendMatchingRequests:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details
        });
        throw error;
    }
}

export {
    sendEmail,
    checkAndSendMatchingRequests
};