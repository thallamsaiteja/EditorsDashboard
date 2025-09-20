/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import './ManagerPage.css';

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/manager';

function ManagerPage() {
    const [submissions, setSubmissions] = useState([]);
    const [editors, setEditors] = useState([]);
    const [selectedEditor, setSelectedEditor] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        // Function to fetch initial data from the REST endpoint
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/dashboard-data`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setSubmissions(data.submissions || []);
                setEditors(data.editors || []);
                console.log('Initial data loaded:', data);
            } catch (error) {
                console.error("Failed to fetch initial dashboard data:", error);
                setConnectionStatus('Error loading data');
            } finally {
                setIsLoading(false);
            }
        };

        // Function to establish the SSE connection
        const establishSSEConnection = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource(`${API_BASE_URL}/dashboard-stream`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log("SSE connection established.");
                setConnectionStatus('Connected');
            };

            // Listen for the custom 'dashboard-update' events
            eventSource.addEventListener('dashboard-update', (event) => {
                try {
                    console.log("Raw event data:", event.data);

                    // Parse the JSON data directly (no double parsing)
                    const updateData = JSON.parse(event.data);
                    console.log("Parsed update data:", updateData);
                    setLastUpdate(new Date().toLocaleTimeString());

                    // Handle different types of events
                    if (updateData.event === 'new_submission') {
                        console.log("Adding new submission:", updateData);
                        setSubmissions(prevSubmissions => {
                            // Check if submission already exists to avoid duplicates
                            const exists = prevSubmissions.some(sub => sub.id === updateData.id);
                            if (!exists) {
                                // Create a submission object with the right structure
                                const newSubmission = {
                                    id: updateData.id,
                                    volunteer_name: updateData.volunteer_name,
                                    status: updateData.status,
                                    video_url: updateData.video_url,
                                    received_at: updateData.received_at,
                                    assigned_editor_id: updateData.assigned_editor_id || null
                                };
                                return [newSubmission, ...prevSubmissions];
                            }
                            return prevSubmissions;
                        });
                    } else if (updateData.event === 'status_update') {
                        console.log("Updating submission status:", updateData);
                        setSubmissions(prevSubmissions =>
                            prevSubmissions.map(sub =>
                                sub.id === updateData.id
                                    ? {
                                        ...sub,
                                        status: updateData.status,
                                        assigned_editor_id: updateData.assigned_editor_id
                                    }
                                    : sub
                            )
                        );
                    }
                } catch (error) {
                    console.error("Error parsing SSE data:", error);
                    console.error("Raw event data was:", event.data);
                }
            });

            // Listen for keep-alive messages
            eventSource.addEventListener('keep-alive', (event) => {
                console.log("Keep-alive received:", event.data);
            });

            // Handle general messages (fallback)
            eventSource.onmessage = (event) => {
                console.log("Received general SSE message:", event);
                try {
                    const data = JSON.parse(event.data);
                    console.log("General message data:", data);
                } catch (error) {
                    console.log("Non-JSON general message:", event.data);
                }
            };

            eventSource.onerror = (error) => {
                console.error("SSE error:", error);
                setConnectionStatus('Connection Error');

                // Attempt reconnection after 5 seconds
                setTimeout(() => {
                    if (eventSource.readyState === EventSource.CLOSED) {
                        console.log("Attempting to reconnect...");
                        establishSSEConnection();
                    }
                }, 5000);
            };

            return eventSource;
        };

        // Initialize the dashboard
        fetchInitialData();
        establishSSEConnection();

        // Cleanup function
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // --- Action Handlers ---
    const updateBackendStatus = async (submissionId, newStatus, assignedEditorId = null) => {
        try {
            const url = new URL(`${API_BASE_URL}/update-submission-status`);
            url.searchParams.append('submission_id', submissionId);
            url.searchParams.append('new_status', newStatus);
            if (assignedEditorId) {
                url.searchParams.append('assigned_editor_id', assignedEditorId);
            }

            const response = await fetch(url.toString(), { method: 'POST' });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update status on backend.');
            }

            const result = await response.json();
            console.log("Backend update successful:", result);
        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error("Backend update error:", error);
        }
    };

    const handleAccept = (submissionId) => {
        console.log("Accepting submission:", submissionId);
        updateBackendStatus(submissionId, 'ACCEPTED');
    };

    const handleDecline = (submissionId) => {
        const reason = prompt("Please provide a reason for declining this video:");
        if (reason) {
            console.log("Declining submission:", submissionId, "Reason:", reason);
            updateBackendStatus(submissionId, 'DECLINED');
        }
    };

    const handleAssign = (submissionId, editorId = null) => {
        const editorToAssign = editorId || selectedEditor;
        if (!editorToAssign) {
            alert('Please select an editor to assign the video to.');
            return;
        }
        console.log("Assigning submission:", submissionId, "to editor:", editorToAssign);
        updateBackendStatus(submissionId, 'ASSIGNED', editorToAssign);
        setSelectedEditor(''); // Reset dropdown for the next assignment
    };

    // --- Calculate assignment counts for the sidebar ---
    const editorAssignmentCounts = editors.map(editor => {
        const count = submissions.filter(sub =>
            sub.status === 'ASSIGNED' && sub.assigned_editor_id === editor.id
        ).length;
        return { ...editor, assignedCount: count };
    });

    const getStatusText = (status) => {
        switch (status) {
            case 'pending_review': return 'Pending Review';
            case 'PROCESSING': return 'Processing';
            case 'ACCEPTED': return 'Ready to Assign';
            case 'ASSIGNED': return 'Assigned to Editor';
            case 'DECLINED': return 'Declined';
            case 'USED': return 'Used';
            default: return status;
        }
    };

    const getStatusClass = (status) => {
        return status.toLowerCase().replace('_', '-');
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString();
        } catch (error) {
            return dateTimeString;
        }
    };

    if (isLoading) {
        return (
            <div className="manager-dashboard-layout">
                <div className="loading-container">
                    <h2>Loading Dashboard...</h2>
                    <p>Please wait while we fetch the latest data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manager-dashboard-layout">
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>Video Submission Dashboard</h1>
                    <p>Review and assign incoming videos from volunteers.</p>
                    <div className="connection-status">
                        <span className={`status-indicator ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
                            ● {connectionStatus}
                        </span>
                        {lastUpdate && (
                            <span className="last-update">
                                Last update: {lastUpdate}
                            </span>
                        )}
                    </div>
                </header>

                <div className="dashboard-stats">
                    <div className="stat-card">
                        <h3>Total Submissions</h3>
                        <p>{submissions.length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Pending Review</h3>
                        <p>{submissions.filter(s => s.status === 'pending_review').length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Ready to Assign</h3>
                        <p>{submissions.filter(s => s.status === 'ACCEPTED').length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Assigned</h3>
                        <p>{submissions.filter(s => s.status === 'ASSIGNED').length}</p>
                    </div>
                </div>

                <div className="video-grid">
                    {submissions.length === 0 ? (
                        <div className="no-submissions">
                            <h3>No submissions found</h3>
                            <p>Submissions will appear here automatically when volunteers submit videos.</p>
                        </div>
                    ) : (
                        submissions.map((submission) => (
                            <div key={submission.id} className={`video-card status-${getStatusClass(submission.status)}`}>
                                <div className="video-preview">
                                    {submission.video_url ? (
                                        <video controls className="video-player">
                                            <source src={submission.video_url} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    ) : (
                                        <div className="player-placeholder">
                                            <p>Video Preview</p>
                                            <small>Processing...</small>
                                        </div>
                                    )}
                                </div>

                                <div className="video-info">
                                    <p><strong>Volunteer:</strong> {submission.volunteer_name}</p>
                                    <p><strong>Status:</strong>
                                        <span className={`status-badge status-${getStatusClass(submission.status)}`}>
                                            {getStatusText(submission.status)}
                                        </span>
                                    </p>
                                    <p><strong>Received:</strong> {formatDateTime(submission.received_at)}</p>
                                    <p><strong>ID:</strong> <code>{submission.id.slice(0, 8)}...</code></p>
                                </div>

                                {/* Accept/Decline buttons - Show only for PENDING_REVIEW */}
                                {(submission.status === 'PENDING_REVIEW' || submission.status == 'pending_review') && (
                                    <div className="action-buttons">
                                        <button
                                            className="btn btn-accept"
                                            onClick={() => handleAccept(submission.id)}
                                        >
                                            ✓ Accept
                                        </button>
                                        <button
                                            className="btn btn-decline"
                                            onClick={() => handleDecline(submission.id)}
                                        >
                                            ✗ Decline
                                        </button>
                                    </div>
                                )}

                                {/* Assignment section - Show only for ACCEPTED */}
                                {submission.status === 'ACCEPTED' && (
                                    <div className="assignment-section">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                className="editor-dropdown"
                                                onChange={(e) => setSelectedEditor(e.target.value)}
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
                                                onClick={() => handleAssign(submission.id)}
                                            >
                                                Assign
                                            </button>
                                        </div>

                                        {/* Quick assign buttons for each editor */}
                                        <div className="quick-assign-buttons">
                                            <small>Quick assign:</small>
                                            {editors.map(editor => (
                                                <button
                                                    key={editor.id}
                                                    className="btn btn-quick-assign"
                                                    onClick={() => handleAssign(submission.id, editor.id)}
                                                    title={`Assign to ${editor.name}`}
                                                >
                                                    {editor.name.split(' ').map(n => n[0]).join('')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Completed status message */}
                                {(submission.status === 'ASSIGNED' || submission.status === 'DECLINED' || submission.status === 'USED') && (
                                    <div className="final-status-message">
                                        <p>✓ This video has been processed.</p>
                                        {submission.status === 'ASSIGNED' && submission.assigned_editor_id && (
                                            <p>
                                                <small>
                                                    Assigned to: {editors.find(e => e.id === submission.assigned_editor_id)?.name || 'Unknown Editor'}
                                                </small>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </main>

            <aside className="dashboard-sidebar">
                <div className="sidebar-content">
                    <h2>Editor Workload</h2>
                    <ul className="editors-list">
                        {editorAssignmentCounts.map(editor => (
                            <li key={editor.id} className="editor-item">
                                <div className="editor-info">
                                    <span className="editor-name">{editor.name}</span>
                                    <span className={`editor-count ${editor.assignedCount > 0 ? 'has-assignments' : ''}`}>
                                        {editor.assignedCount} assigned
                                    </span>
                                </div>
                                <div className="editor-actions">
                                    <button
                                        className="btn btn-mini"
                                        onClick={() => {
                                            const assignableSubmissions = submissions.filter(s => s.status === 'ACCEPTED');
                                            if (assignableSubmissions.length > 0) {
                                                const nextSubmission = assignableSubmissions[0];
                                                handleAssign(nextSubmission.id, editor.id);
                                            } else {
                                                alert('No submissions available for assignment.');
                                            }
                                        }}
                                        disabled={submissions.filter(s => s.status === 'ACCEPTED').length === 0}
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
                                <span className="stat-value">{submissions.filter(s => s.status === 'PENDING_REVIEW').length}</span>
                            </div>
                            <div className="quick-stat">
                                <span className="stat-label">Total Editors:</span>
                                <span className="stat-value">{editors.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default ManagerPage;
