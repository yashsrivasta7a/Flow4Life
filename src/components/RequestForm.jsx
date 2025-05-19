import React, { useState } from 'react';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDonationRequests } from '../contexts/DonationRequestsContext';

const RequestForm = () => {
    const [formData, setFormData] = useState({
        bloodType: '',
        city: '',
        hospital: '',
        contactNumber: '',
        additionalInfo: ''
    });
    const { user } = useAuth();
    const { checkAndSendMatchingRequests } = useDonationRequests();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Fetch the user's email from the database
            const userRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();
            const userEmail = userData.email;

            const requestData = {
                ...formData,
                userId: user.uid,
                status: 'pending',
                timestamp: Date.now(),
                email: userEmail // Store the user's email in the request
            };

            const requestRef = ref(database, 'blood_requests');
            const newRequestRef = push(requestRef);
            await set(newRequestRef, requestData);

            // Check for matching donors and send emails
            await checkAndSendMatchingRequests(requestData);

            setFormData({
                bloodType: '',
                city: '',
                hospital: '',
                contactNumber: '',
                additionalInfo: ''
            });
            alert('Request submitted successfully!');
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request. Please try again.');
        }
    };

    return (
        <div>
            {/* Render your form here */}
        </div>
    );
};

export default RequestForm; 