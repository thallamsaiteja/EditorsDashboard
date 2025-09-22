import React, { useState, useEffect } from 'react';
import './EditorsList.css';
import { getManagerTeamApi, updateUserStatusApi } from '../../apiService.js';

export default function EditorsList() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getManagerTeamApi();
            setUsers(data);
            if (data.length === 0) {
                setMessage("There are no users to manage at the moment.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAccept = async (userId) => {
        try {
            // Call the API to set is_active and is_verified to true
            await updateUserStatusApi(userId, true, true);
            // Update the UI instantly for a better user experience
            setUsers(currentUsers => currentUsers.map(user => 
                user.user_id === userId 
                ? { ...user, is_verified: true, is_active: true, role: 'EDITOR' } 
                : user
            ));
            setMessage("User successfully accepted as an Editor.");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRevoke = async (userId) => {
        // Add a confirmation dialog for safety
        if (window.confirm("Are you sure you want to revoke this editor's access? This will deactivate their account.")) {
            try {
                // Call the API to set is_active and is_verified to false
                await updateUserStatusApi(userId, false, false);
                // Update the UI instantly
                setUsers(currentUsers => currentUsers.map(user => 
                    user.user_id === userId 
                    ? { ...user, is_verified: false, is_active: false } 
                    : user
                ));
                setMessage("Editor access has been revoked.");
            } catch (err) {
                setError(err.message);
            }
        }
    };

    // This helper function decides what to render in the final table column
    const renderStatusAndActions = (user) => {
        // Case 1: New user waiting for approval
        if (user.role === 'NOT_SELECTED') {
            return (
                <td className="actions-cell">
                    <button className="action-button accept" onClick={() => handleAccept(user.user_id)}>
                        Accept
                    </button>
                </td>
            );
        }
        // Case 2: User is an active and verified editor
        if (user.is_verified && user.is_active) {
            return (
                <td className="actions-cell">
                    <span className="status-badge verified">Verified</span>
                    <button className="action-button revoke" onClick={() => handleRevoke(user.user_id)}>
                        Revoke
                    </button>
                </td>
            );
        }
        // Case 3: User has been revoked or is inactive
        return (
            <td className="actions-cell">
                <span className="status-badge revoked">Not Active</span>
            </td>
        );
    };

    if (isLoading) return <div className="loading-message">Loading Team List...</div>;
    if (error) return <div className="error-message-full">Error: {error}</div>;

    return (
        <div className="list-card">
            <h2 className="list-title">Manage Team</h2>
            {message && <p className="info-message">{message}</p>}
            
            {users.length > 0 ? (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Status & Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.user_id}>
                                <td>{user.full_name}</td>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                {renderStatusAndActions(user)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : !message && (
                 <p>No users found.</p>
            )}
        </div>
    );
}

