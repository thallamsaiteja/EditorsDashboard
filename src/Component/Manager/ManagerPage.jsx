import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ManagerPage.css';
import LogoutButton from '../Auth/logout/logout.jsx'; // Import the LogoutButton component

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/manager';

const TAB_OPTIONS = [
    { key: 'review', label: 'Review', statuses: ['pending_review', 'PENDING_REVIEW', 'accepted', 'ACCEPTED'] },
    { key: 'assigned', label: 'Assigned', statuses: ['assigned', 'ASSIGNED'] },
    { key: 'revisions', label: 'Revisions', assignmentStatuses: ['REVISION_NEEDED'] }, // New tab
    { key: 'declined', label: 'Declined', statuses: ['declined', 'DECLINED'] },
    { key: 'used', label: 'Completed', statuses: ['used', 'USED'] },
];

function ManagerPage() {
    const [submissions, setSubmissions] = useState([]);
    const [assignments, setAssignments] = useState([]); // New state for assignments
    const [editors, setEditors] = useState([]);
    const [selectedEditor, setSelectedEditor] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(TAB_OPTIONS[0].key);
    const [managerProfile, setManagerProfile] = useState(null);

    // Updated state for revision modal - removed reassignEditorId
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [managerNotes, setManagerNotes] = useState(''); // This will be mandatory

    const eventSourceRef = useRef(null);
    const navigate = useNavigate();

    // Helper function to get auth token
    const getAuthToken = () => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; authToken=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // Helper function to clear auth token and redirect to login
    const handleAuthError = () => {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        navigate('/login');
    };

    // Helper function to make authenticated API calls
    const authenticatedFetch = async (url, options = {}) => {
        const token = getAuthToken();

        if (!token) {
            handleAuthError();
            throw new Error('No authentication token found');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const response = await fetch(url, { ...options, ...defaultOptions });

        if (response.status === 401) {
            handleAuthError();
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return response;
    };

    // Helper function to get date classification
    const getDateClassification = (dateTimeString) => {
        if (!dateTimeString) return 'old';

        try {
            const receivedDate = dateTimeString.split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            if (receivedDate === today) return 'today';
            if (receivedDate === yesterday) return 'yesterday';
            return 'old';
        } catch (error) {
            return 'old';
        }
    };

    // Helper function to get date tag display
    const getDateTag = (classification) => {
        switch (classification) {
            case 'today':
                return { text: "Today's", class: 'date-tag-today' };
            case 'yesterday':
                return { text: 'Yesterday', class: 'date-tag-yesterday' };
            case 'old':
                return { text: 'Old Video', class: 'date-tag-old' };
            default:
                return { text: 'Old Video', class: 'date-tag-old' };
        }
    };

    // Helper function to format date with classification for "Received" field
    const formatDateTimeWithClassification = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';

        try {
            const date = new Date(dateTimeString);
            const classification = getDateClassification(dateTimeString);

            if (classification === 'today') {
                return `Today at ${date.toLocaleTimeString()}`;
            } else if (classification === 'yesterday') {
                return `Yesterday at ${date.toLocaleTimeString()}`;
            } else {
                return date.toLocaleString();
            }
        } catch (error) {
            return dateTimeString;
        }
    };

    // Helper function to check if assignment was made today
    const isAssignedToday = (submission) => {
        if (!submission.received_at || !['assigned', 'ASSIGNED'].includes(submission.status)) return false;

        try {
            const assignedDate = submission.received_at.split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            return assignedDate === today;
        } catch (error) {
            return false;
        }
    };

    // Helper function to check if URL is an api.video embed URL
    const isApiVideoUrl = (url) => {
        return url && url.includes('embed.api.video');
    };

    useEffect(() => {
        // Check authentication first
        const token = getAuthToken();
        if (!token) {
            handleAuthError();
            return;
        }

        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-data`);
                const data = await response.json();

                setSubmissions(data.submissions || []);
                setAssignments(data.assignments || []); // Set assignments
                setEditors(data.editors || []);
                setManagerProfile(data.manager_profile || null);
                setConnectionStatus('Connected');
                console.log('Initial manager data loaded:', data);

            } catch (error) {
                console.error("Failed to fetch initial manager data:", error);
                setConnectionStatus('Error loading data');
                if (error.message.includes('authentication') || error.message.includes('Session expired')) {
                    handleAuthError();
                }
            } finally {
                setIsLoading(false);
            }
        };

        const establishSSEConnection = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const token = getAuthToken();
            if (!token) {
                handleAuthError();
                return;
            }

            // ✅ Pass token as query parameter for SSE (since headers don't work)
            const sseUrl = `${API_BASE_URL}/dashboard-stream?token=${encodeURIComponent(token)}`;
            const eventSource = new EventSource(sseUrl);

            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log("Manager SSE connection established.");
                setConnectionStatus('Connected');
            };

            eventSource.addEventListener('dashboard-update', (event) => {
                try {
                    console.log("Raw manager event data:", event.data);
                    const updateData = JSON.parse(event.data);
                    console.log("Parsed manager update data:", updateData);
                    setLastUpdate(new Date().toLocaleTimeString());

                    if (updateData.event === 'new_submission') {
                        setSubmissions(prev =>
                            prev.some(sub => sub.id === updateData.id) ? prev :
                                [{ ...updateData }, ...prev]
                        );
                    } else if (updateData.event === 'status_update') {
                        setSubmissions(prev => prev.map(sub => sub.id === updateData.id
                            ? { ...sub, ...updateData }
                            : sub
                        )
                        );
                    } else if (updateData.event === 'assignment_created') {
                        setSubmissions(prev =>
                            prev.map(sub =>
                                sub.id === updateData.video_submission_id
                                    ? {
                                        ...sub,
                                        status: 'ASSIGNED',
                                        assigned_editor_id: updateData.assigned_editor_id,
                                        assignment_id: updateData.assignment_id
                                    }
                                    : sub
                            )
                        );
                    } else if (updateData.event === 'assignment_update') {
                        // Update assignments list
                        setAssignments(prev =>
                            prev.map(assignment =>
                                assignment.assignment_id === updateData.assignment_id
                                    ? { ...assignment, ...updateData }
                                    : assignment
                            )
                        );
                    }
                } catch (error) {
                    console.error("Error parsing manager SSE data:", error);
                }
            });

            eventSource.addEventListener('keep-alive', (event) => {
                console.log("Manager keep-alive received:", event.data);
            });

            eventSource.onerror = (error) => {
                console.error("Manager SSE error:", error);
                setConnectionStatus('Connection Error');

                if (error.target && error.target.readyState === EventSource.CLOSED) {
                    setTimeout(() => {
                        const currentToken = getAuthToken();
                        if (currentToken) {
                            console.log("Attempting to reconnect manager SSE...");
                            establishSSEConnection();
                        } else {
                            handleAuthError();
                        }
                    }, 5000);
                }
            };
        };

        fetchInitialData();
        establishSSEConnection();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [navigate]);

    // --- Action Handlers ---
    const updateBackendStatus = async (submissionId, newStatus, assignedEditorId = null, declineReason = null) => {
        try {
            const url = new URL(`${API_BASE_URL}/update-submission-status`);
            url.searchParams.append('submission_id', submissionId);
            url.searchParams.append('new_status', newStatus);
            if (assignedEditorId) url.searchParams.append('assigned_editor_id', assignedEditorId);
            if (declineReason) url.searchParams.append('decline_reason', declineReason);

            const response = await authenticatedFetch(url.toString(), { method: 'POST' });
            const result = await response.json();

            console.log("Status updated successfully:", result);

        } catch (error) {
            console.error("Error updating status:", error);
            alert(`Error: ${error.message}`);
        }
    };

    // Updated modal handler - no editor selection needed
    const handleOpenReassignModal = (assignment) => {
        setSelectedAssignment(assignment);
        setManagerNotes(''); // Clear previous notes
        setShowReassignModal(true);
    };

    const handleCloseReassignModal = () => {
        setShowReassignModal(false);
        setSelectedAssignment(null);
        setManagerNotes('');
    };

    // Updated reassign handler - keep same editor, require manager notes
    const handleReassignAssignment = async () => {
        // Make manager notes mandatory
        if (!managerNotes || !managerNotes.trim()) {
            alert('Please provide instructions/reason for sending this back to the editor.');
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/reassign-assignment`);
            url.searchParams.append('assignment_id', selectedAssignment.assignment_id);
            url.searchParams.append('new_editor_id', selectedAssignment.assigned_editor_id); // Keep same editor
            url.searchParams.append('manager_notes', managerNotes.trim()); // Mandatory notes

            const response = await authenticatedFetch(url.toString(), { method: 'POST' });
            const result = await response.json();

            console.log("Assignment sent back successfully:", result);

            // Update assignments list - same editor, new status, with manager notes
            setAssignments(prev =>
                prev.map(assignment =>
                    assignment.assignment_id === selectedAssignment.assignment_id
                        ? {
                            ...assignment,
                            assignment_status: 'IN_PROGRESS', // Reset to in progress
                            manager_notes: managerNotes.trim(),
                            assigned_at: new Date().toISOString() // Update timestamp
                        }
                        : assignment
                )
            );

            handleCloseReassignModal();

        } catch (error) {
            console.error("Error sending back assignment:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleDeclineAssignment = async (assignment) => {
        const reason = prompt("Please provide a reason for declining this assignment:");
        if (!reason || !reason.trim()) {
            alert("Please provide a reason for declining the assignment.");
            return;
        }

        try {
            const url = new URL(`${API_BASE_URL}/decline-assignment`);
            url.searchParams.append('assignment_id', assignment.assignment_id);
            url.searchParams.append('decline_reason', reason.trim());

            const response = await authenticatedFetch(url.toString(), { method: 'POST' });
            const result = await response.json();

            console.log("Assignment declined successfully:", result);

            // Remove from assignments list since it's now declined
            setAssignments(prev =>
                prev.filter(a => a.assignment_id !== assignment.assignment_id)
            );

        } catch (error) {
            console.error("Error declining assignment:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleAccept = (submissionId) => updateBackendStatus(submissionId, 'accepted');

    const handleDecline = (submissionId) => {
        const reason = prompt("Please provide a reason for declining this video:");
        if (reason && reason.trim()) {
            updateBackendStatus(submissionId, 'declined', null, reason.trim());
        } else if (reason === '') {
            alert("Please provide a reason for declining the video.");
        }
    };

    const handleAssign = (submissionId, editorId = null) => {
        const editorToAssign = editorId || selectedEditor;
        if (!editorToAssign) {
            return alert('Please select an editor to assign the video to.');
        }
        updateBackendStatus(submissionId, 'assigned', editorToAssign);
        setSelectedEditor('');
    };

    // Updated editor assignment counts - only count TODAY'S assignments
    const editorAssignmentCounts = editors.map(editor => ({
        ...editor,
        assignedCount: submissions.filter(sub =>
            (sub.status === 'ASSIGNED' || sub.status === 'assigned') &&
            sub.assigned_editor_id === editor.id &&
            isAssignedToday(sub)
        ).length
    }));

    const getStatusText = (status) => {
        switch (status) {
            case 'PENDING_REVIEW':
            case 'pending_review':
                return 'Pending Review';
            case 'PROCESSING':
                return 'Processing';
            case 'ACCEPTED':
            case 'accepted':
                return 'Ready to Assign';
            case 'ASSIGNED':
            case 'assigned':
                return 'Assigned to Editor';
            case 'DECLINED':
            case 'declined':
                return 'Declined';
            case 'USED':
            case 'used':
                return 'Used';
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'COMPLETED':
                return 'Completed';
            case 'REVISION_NEEDED':
                return 'Revision Needed';
            default:
                return status;
        }
    };

    const getStatusClass = (status) => status.toLowerCase().replace('_', '-');

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString();
        } catch (_) {
            return dateTimeString;
        }
    };

    // Updated filtering logic for new revisions tab
    const tabConfig = TAB_OPTIONS.find(tab => tab.key === activeTab);
    let filteredData = [];

    if (activeTab === 'revisions') {
        // For revisions tab, filter assignments by status
        filteredData = assignments.filter(assignment =>
            tabConfig.assignmentStatuses && tabConfig.assignmentStatuses.includes(assignment.assignment_status)
        );
    } else {
        // For other tabs, filter submissions by status
        filteredData = submissions.filter(sub =>
            tabConfig.statuses && tabConfig.statuses.includes(sub.status)
        );
    }

    if (isLoading) {
        return (
            <div className="manager-dashboard-layout">
                <div className="loading-container">
                    <h2>Loading Manager Dashboard...</h2>
                    <p>Please wait while we fetch the latest data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manager-dashboard-layout">
            <main className="dashboard-main">
                {/* Header */}
                <header className="dashboard-header">
                    <h1>Video Submission Dashboard</h1>
                    <p>Review and assign incoming videos from volunteers.</p>
                    <div className="connection-status">
                        <span className={`status-indicator ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
                            ● {connectionStatus}
                        </span>
                        <button
                            type="button"
                            className="editots_list_display_button"
                            onClick={() => navigate('/managerdashboard/EditorsList')} // go to list [web:98]
                            title="Open Editors List"
                        >
                            Editors List
                        </button>
                        {lastUpdate && (
                            <span className="last-update">
                                Last update: {lastUpdate}
                            </span>
                        )}
                    </div>
                </header>

                {/* Tabs */}
                <div className="tabs-container" style={{ display: 'flex', gap: 8 }}>
                    {TAB_OPTIONS.map(tab => (
                        <button
                            key={tab.key}
                            className={`btn ${activeTab === tab.key ? 'btn-assign' : 'btn-mini'}`}
                            style={{ textTransform: 'uppercase', minWidth: 90 }}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <h3>Pending Review</h3>
                        <p>{submissions.filter(s => ['PENDING_REVIEW', 'pending_review'].includes(s.status)).length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Ready to Assign</h3>
                        <p>{submissions.filter(s => ['ACCEPTED', 'accepted'].includes(s.status)).length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Assigned</h3>
                        <p>{submissions.filter(s => ['ASSIGNED', 'assigned'].includes(s.status)).length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Revisions</h3>
                        <p>{assignments.filter(a => a.assignment_status === 'REVISION_NEEDED').length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Used Videos</h3>
                        <p>{submissions.filter(s => ['USED', 'used'].includes(s.status)).length}</p>
                    </div>
                </div>

                {/* Video/Assignment Grid (Tab filtered) - NOW SCROLLABLE */}
                <div className="video-grid-container">
                    <div className="video-grid">
                        {filteredData.length === 0 ? (
                            <div className="no-submissions">
                                <h3>No {activeTab === 'revisions' ? 'revision requests' : 'submissions'} found</h3>
                                <p>{activeTab === 'revisions' ? 'Revision requests' : 'Submissions'} will appear here when available.</p>
                            </div>
                        ) : (
                            filteredData.map((item) => {
                                // Determine if this is an assignment (revision tab) or submission
                                const isAssignment = activeTab === 'revisions';
                                const dateClassification = getDateClassification(isAssignment ? item.assigned_at : item.received_at);
                                const dateTag = getDateTag(dateClassification);

                                return (
                                    <div key={isAssignment ? item.assignment_id : item.id}
                                        className={`video-card status-${getStatusClass(isAssignment ? item.assignment_status : item.status)}`}>

                                        <div className="video-preview">
                                            {item.video_url ? (
                                                isApiVideoUrl(item.video_url) ? (
                                                    <iframe
                                                        src={item.video_url}
                                                        width="100%"
                                                        height="100%"
                                                        frameBorder="0"
                                                        scrolling="no"
                                                        allowFullScreen
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                            borderRadius: '4px'
                                                        }}
                                                        title={`Video by ${item.volunteer_name}`}
                                                    />
                                                ) : (
                                                    <video controls className="video-player">
                                                        <source src={item.video_url} type="video/mp4" />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                )
                                            ) : (
                                                <div className="player-placeholder">
                                                    <p>Video Preview</p>
                                                    <small>Processing...</small>
                                                </div>
                                            )}
                                        </div>

                                        <div className="video-info">
                                            <p><strong>Volunteer:</strong> {item.volunteer_name}</p>

                                            {isAssignment && (
                                                <p><strong>Editor:</strong> {item.assigned_editor_name}</p>
                                            )}

                                            <p><strong>Status:</strong>
                                                <span className={`status-badge status-${getStatusClass(isAssignment ? item.assignment_status : item.status)}`}>
                                                    {getStatusText(isAssignment ? item.assignment_status : item.status)}
                                                </span>
                                            </p>

                                            <p><strong>{isAssignment ? 'Assigned' : 'Received'}:</strong>
                                                {formatDateTimeWithClassification(isAssignment ? item.assigned_at : item.received_at)}
                                            </p>

                                            <p><strong>ID:</strong> <code>{(isAssignment ? item.assignment_id : item.id).slice(0, 8)}...</code></p>

                                            {/* Show revision notes for revision requests */}
                                            {isAssignment && item.revision_notes && (
                                                <div style={{
                                                    backgroundColor: '#f8d7da',
                                                    padding: '10px',
                                                    borderRadius: '4px',
                                                    marginTop: '10px',
                                                    border: '1px solid #f5c6cb'
                                                }}>
                                                    <p><strong>Editor's Revision Reason:</strong></p>
                                                    <p style={{ color: '#721c24', fontStyle: 'italic', margin: '5px 0 0 0' }}>
                                                        "{item.revision_notes}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Show manager notes if any */}
                                            {isAssignment && item.manager_notes && (
                                                <div style={{
                                                    backgroundColor: '#d4edda',
                                                    padding: '10px',
                                                    borderRadius: '4px',
                                                    marginTop: '10px',
                                                    border: '1px solid #c3e6cb'
                                                }}>
                                                    <p><strong>Previous Manager Instructions:</strong></p>
                                                    <p style={{ color: '#155724', fontStyle: 'italic', margin: '5px 0 0 0' }}>
                                                        "{item.manager_notes}"
                                                    </p>
                                                </div>
                                            )}

                                            {!isAssignment && item.decline_reason && (
                                                <p><strong>Decline Reason:</strong> <em>{item.decline_reason}</em></p>
                                            )}
                                        </div>

                                        {/* Action Section for different tabs */}
                                        {activeTab === 'revisions' && (
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-assign"
                                                    onClick={() => handleOpenReassignModal(item)}
                                                    style={{
                                                        marginRight: '8px',
                                                        backgroundColor: '#ffc107',
                                                        color: '#212529'
                                                    }}
                                                >
                                                    📝 Send Back
                                                </button>
                                                <button
                                                    className="btn btn-decline"
                                                    onClick={() => handleDeclineAssignment(item)}
                                                >
                                                    ✗ Decline
                                                </button>
                                            </div>
                                        )}

                                        {(['pending_review', 'PENDING_REVIEW'].includes(item.status) && activeTab === 'review') && (
                                            <div className="action-buttons">
                                                <button className="btn btn-accept" onClick={() => handleAccept(item.id)}>
                                                    ✓ Accept
                                                </button>
                                                <button className="btn btn-decline" onClick={() => handleDecline(item.id)}>
                                                    ✗ Decline
                                                </button>
                                            </div>
                                        )}

                                        {(item.status === 'accepted' || item.status === 'ACCEPTED') && activeTab === 'review' && (
                                            <div className="assignment-section">
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <select
                                                        className="editor-dropdown"
                                                        onChange={e => setSelectedEditor(e.target.value)}
                                                        value={selectedEditor}
                                                    >
                                                        <option value="">-- Select Editor --</option>
                                                        {editors.map(editor => (
                                                            <option key={editor.id} value={editor.id}>
                                                                {editor.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        className="btn btn-assign"
                                                        onClick={() => handleAssign(item.id)}
                                                    >
                                                        Assign
                                                    </button>
                                                </div>
                                                <div className="quick-assign-buttons">
                                                    <small>Quick assign:</small>
                                                    {editors.map(editor => (
                                                        <button
                                                            key={editor.id}
                                                            className="btn btn-quick-assign"
                                                            onClick={() => handleAssign(item.id, editor.id)}
                                                            title={`Assign to ${editor.name}`}
                                                        >
                                                            {editor.name.split(' ').map(n => n[0]).join('')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Final Status Message for assigned/declined/used */}
                                        {(['assigned', 'ASSIGNED', 'declined', 'DECLINED', 'used', 'USED'].includes(item.status)) && activeTab !== 'revisions' && (
                                            <div className="final-status-message">
                                                <p>✓ This video has been processed.</p>
                                                {(['assigned', 'ASSIGNED'].includes(item.status) && item.assigned_editor_id) && (
                                                    <p>
                                                        <small>
                                                            Assigned to: {editors.find(e => e.id === item.assigned_editor_id)?.name || 'Unknown Editor'}
                                                        </small>
                                                    </p>
                                                )}
                                                {(['used', 'USED'].includes(item.status)) && (
                                                    <p>
                                                        <small style={{ color: '#28a745', fontWeight: '600' }}>
                                                            🎬 This video has been completed and used in production
                                                        </small>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            <aside className="dashboard-sidebar">
                <div className="sidebar-content">
                    {/* ✅ Manager Profile Card */}
                    <div className="sidebar-profile">
                        <div className="sidebar-profile__avatar">
                            {managerProfile?.full_name?.charAt(0) || 'M'}
                        </div>
                        <h2 className="sidebar-profile__name">
                            {managerProfile?.full_name || 'Manager Name'}
                        </h2>
                        <p className="sidebar-profile__email">
                            {managerProfile?.email || 'manager@kaizernews.com'}
                        </p>
                        <p className="sidebar-profile__role">
                            {managerProfile?.role || 'MANAGER'} • {managerProfile?.is_verified ? 'Verified' : 'Pending'}
                        </p>


                        <LogoutButton
                            className="sidebar-link"
                            onBeforeLogout={() => {
                                if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } // stop SSE [web:3]
                            }}
                        />

                    </div>

                    <h3>Today's Editor Workload</h3>
                    <ul className="editors-list">
                        {editorAssignmentCounts.map(editor => (
                            <li key={editor.id} className="editor-item">
                                <div className="editor-info">
                                    <span className="editor-name">{editor.name}</span>
                                    <span className={`editor-count ${editor.assignedCount > 0 ? 'has-assignments' : ''}`}>
                                        {editor.assignedCount} today
                                    </span>
                                </div>
                                <div className="editor-actions">
                                    <button
                                        className="btn btn-mini"
                                        onClick={() => {
                                            const assignableSubmissions = submissions.filter(s => ['accepted', 'ACCEPTED'].includes(s.status));
                                            if (assignableSubmissions.length > 0) {
                                                const nextSubmission = assignableSubmissions[0];
                                                handleAssign(nextSubmission.id, editor.id);
                                            } else {
                                                alert('No submissions available for assignment.');
                                            }
                                        }}
                                        disabled={submissions.filter(s => ['accepted', 'ACCEPTED'].includes(s.status)).length === 0}
                                    >
                                        Auto Assign
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="sidebar-stats">
                        <h3>Quick Stats</h3>
                        <div className="quick-stats">
                            <div className="quick-stat">
                                <span className="stat-label">Processing:</span>
                                <span className="stat-value">{submissions.filter(s => s.status === 'PROCESSING').length}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Pending:</span>
                                <span className="stat-value">{submissions.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'pending_review').length}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Revisions:</span>
                                <span className="stat-value">{assignments.filter(a => a.assignment_status === 'REVISION_NEEDED').length}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Used Videos:</span>
                                <span className="stat-value">{submissions.filter(s => s.status === 'USED' || s.status === 'used').length}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Total Editors:</span>
                                <span className="stat-value">{editors.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <Link to="/" className="sidebar-link">Back to Home</Link>
            </aside>

            {/* Updated Send Back Modal */}
            {showReassignModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Send Back to Editor</h2>
                        <div className="assignment-context" style={{
                            backgroundColor: '#fff3cd',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #ffeaa7'
                        }}>
                            <p><strong>Video from:</strong> {selectedAssignment?.volunteer_name}</p>
                            <p><strong>Editor:</strong> {selectedAssignment?.assigned_editor_name}</p>
                            <p><strong>Originally Assigned:</strong> {formatDateTime(selectedAssignment?.assigned_at)}</p>
                            {selectedAssignment?.revision_notes && (
                                <div style={{
                                    backgroundColor: '#f8d7da',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    marginTop: '10px',
                                    border: '1px solid #f5c6cb'
                                }}>
                                    <p><strong>Editor's Revision Reason:</strong></p>
                                    <p style={{ color: '#721c24', fontStyle: 'italic', margin: '5px 0 0 0' }}>
                                        "{selectedAssignment.revision_notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="modal-form">
                            <label htmlFor="manager-notes" style={{ color: '#d9534f', fontWeight: 'bold' }}>
                                Manager Instructions/Reason (Required) *
                            </label>
                            <textarea
                                id="manager-notes"
                                className="modal-textarea"
                                placeholder="Explain why you're sending this back to the editor and what needs to be done..."
                                value={managerNotes}
                                onChange={(e) => setManagerNotes(e.target.value)}
                                rows={4}
                                required
                                style={{
                                    borderColor: managerNotes.trim() ? '#28a745' : '#dc3545',
                                    borderWidth: '2px'
                                }}
                            />
                            <small style={{ color: '#6c757d', marginTop: '5px', display: 'block' }}>
                                This message will be sent to <strong>{selectedAssignment?.assigned_editor_name}</strong>
                                explaining why the work needs to be redone.
                            </small>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn--secondary" onClick={handleCloseReassignModal}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-assign"
                                onClick={handleReassignAssignment}
                                disabled={!managerNotes.trim()}
                                style={{
                                    backgroundColor: managerNotes.trim() ? '#ffc107' : '#6c757d',
                                    color: managerNotes.trim() ? '#212529' : '#fff',
                                    cursor: managerNotes.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Send Back to Editor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagerPage;
