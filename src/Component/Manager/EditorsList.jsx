import React, { useState, useEffect } from 'react';
import './EditorsList.css';
import { getManagerTeamApi, updateUserApi } from '../../apiService.js'; // Use the new updateUserApi

export default function EditorsList() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    // NEW: State to track which user is currently being edited
    const [editingUserId, setEditingUserId] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');

    // This function fetches the initial list of users
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

    // Run fetchUsers once when the component loads
    useEffect(() => {
        fetchUsers();
    }, []);

    // --- Action Handlers ---

    const handleAccept = async (user) => {
        try {
            await updateUserApi(user.user_id, { role: 'EDITOR', is_active: true, is_verified: true });
            await fetchUsers(); // Refetch the list to get the most up-to-date data
            setMessage(`User ${user.username} has been accepted as an Editor.`);
        } catch (err) { setError(err.message); }
    };

    const handleDecline = async (user) => {
        if (window.confirm(`Are you sure you want to decline the request for ${user.username}?`)) {
            try {
                await updateUserApi(user.user_id, { is_active: false, is_verified: false });
                await fetchUsers();
                setMessage(`User ${user.username}'s request has been declined.`);
            } catch (err) { setError(err.message); }
        }
    };

    const handleUpdateClick = (user) => {
        setEditingUserId(user.user_id);
        setSelectedRole(user.role);
    };

    const handleCancelUpdate = () => {
        setEditingUserId(null);
        setSelectedRole('');
    };

    const handleSaveChanges = async (user) => {
        try {
            const updates = { role: selectedRole };
            // Automatically set status based on the new role
            if (selectedRole === 'NOT_SELECTED') {
                updates.is_active = true;
                updates.is_verified = false;
            } else {
                updates.is_active = true;
                updates.is_verified = true;
            }
            await updateUserApi(user.user_id, updates);
            setEditingUserId(null);
            await fetchUsers();
            setMessage(`User ${user.username}'s role has been updated.`);
        } catch (err) {
            setError(err.message);
        }
    };
    
    if (isLoading) return <div className="loading-message">Loading Team List...</div>;
    if (error) return <div className="error-message-full">Error: {error}</div>;

    return (
        <div className="list-card">
            <h2 className="list-title">Manage Team</h2>
            {message && <p className="info-message">{message}</p>}
            
            <table className="user-table">
                <thead>
                    <tr>
                        <th>Full Name</th>
                        <th>Username</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.user_id}>
                            <td>{user.full_name}</td>
                            <td>{user.username}</td>
                            <td>
                                {user.role === 'NOT_SELECTED' && <span className="status-badge pending">Pending</span>}
                                {user.role === 'EDITOR' && user.is_active && <span className="status-badge verified">Editor</span>}
                                {!user.is_active && <span className="status-badge revoked">Not Active</span>}
                            </td>
                            <td className="actions-cell">
                                {editingUserId === user.user_id ? (
                                    // --- EDIT MODE UI ---
                                    <>
                                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="role-select">
                                            <option value="EDITOR">Editor</option>
                                            <option value="NOT_SELECTED">Pending</option>
                                        </select>
                                        <button className="action-button save" onClick={() => handleSaveChanges(user)}>Save</button>
                                        <button className="action-button cancel" onClick={handleCancelUpdate}>Cancel</button>
                                    </>
                                ) : (
                                    // --- DEFAULT VIEW UI ---
                                    <>
                                        {user.role === 'NOT_SELECTED' && (
                                            <>
                                                <button className="action-button accept" onClick={() => handleAccept(user)}>Accept</button>
                                                <button className="action-button revoke" onClick={() => handleDecline(user)}>Decline</button>
                                            </>
                                        )}
                                        {user.role === 'EDITOR' && (
                                            <button className="action-button update" onClick={() => handleUpdateClick(user)}>Update</button>
                                        )}
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

