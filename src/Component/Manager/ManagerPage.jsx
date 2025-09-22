import React, { useState, useEffect, useRef } from 'react';
import './ManagerPage.css';

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/manager';

const TAB_OPTIONS = [
    { key: 'review', label: 'Review', statuses: ['pending_review', 'PENDING_REVIEW', 'accepted', 'ACCEPTED'] },
    { key: 'assigned', label: 'Assigned', statuses: ['assigned', 'ASSIGNED'] },
    { key: 'declined', label: 'Declined', statuses: ['declined', 'DECLINED'] },
];

function ManagerPage() {
    const [submissions, setSubmissions] = useState([]);
    const [editors, setEditors] = useState([]);
    const [selectedEditor, setSelectedEditor] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(TAB_OPTIONS[0].key);
    const eventSourceRef = useRef(null);

    // Helper function to get date classification
    const getDateClassification = (dateTimeString) => {
        if (!dateTimeString) return 'old';

        try {
            const receivedDate = dateTimeString.split('T')[0]; // Extract date part (YYYY-MM-DD)
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
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/dashboard-data`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setSubmissions(data.submissions || []);
                setEditors(data.editors || []);
                setConnectionStatus('Connected');
            } catch (error) {
                setConnectionStatus('Error loading data');
            } finally {
                setIsLoading(false);
            }
        };

        const establishSSEConnection = () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            const eventSource = new EventSource(`${API_BASE_URL}/dashboard-stream`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => setConnectionStatus('Connected');

            eventSource.addEventListener('dashboard-update', (event) => {
                try {
                    const updateData = JSON.parse(event.data);
                    setLastUpdate(new Date().toLocaleTimeString());
                    if (updateData.event === 'new_submission') {
                        setSubmissions(prev =>
                            prev.some(sub => sub.id === updateData.id) ? prev :
                                [{ ...updateData }, ...prev]
                        );
                    } else if (updateData.event === 'status_update') {
                        setSubmissions(prev =>
                            prev.map(sub =>
                                sub.id === updateData.id
                                    ? { ...sub, status: updateData.status, assigned_editor_id: updateData.assigned_editor_id || sub.assigned_editor_id }
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
                    }
                } catch (_) { }
            });

            eventSource.addEventListener('keep-alive', () => { });
            eventSource.onmessage = () => { };
            eventSource.onerror = () => {
                setConnectionStatus('Connection Error');
                setTimeout(() => {
                    if (eventSource.readyState === EventSource.CLOSED) establishSSEConnection();
                }, 5000);
            };
            return eventSource;
        };

        fetchInitialData();
        establishSSEConnection();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // --- Action Handlers ---
    const updateBackendStatus = async (submissionId, newStatus, assignedEditorId = null, declineReason = null) => {
        try {
            const url = new URL(`${API_BASE_URL}/update-submission-status`);
            url.searchParams.append('submission_id', submissionId);
            url.searchParams.append('new_status', newStatus);
            if (assignedEditorId) url.searchParams.append('assigned_editor_id', assignedEditorId);
            if (declineReason) url.searchParams.append('decline_reason', declineReason);
            const response = await fetch(url.toString(), { method: 'POST' });
            if (!response.ok) throw new Error((await response.json()).detail || 'Failed to update status on backend.');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleAccept = (submissionId) => updateBackendStatus(submissionId, 'accepted');
    const handleDecline = (submissionId) => {
        const reason = prompt("Please provide a reason for declining this video:");
        if (reason && reason.trim()) updateBackendStatus(submissionId, 'declined', null, reason.trim());
        else if (reason === '') alert("Please provide a reason for declining the video.");
    };
    const handleAssign = (submissionId, editorId = null) => {
        const editorToAssign = editorId || selectedEditor;
        if (!editorToAssign) return alert('Please select an editor to assign the video to.');
        updateBackendStatus(submissionId, 'assigned', editorToAssign);
        setSelectedEditor('');
    };

    // Updated editor assignment counts - only count TODAY'S assignments
    const editorAssignmentCounts = editors.map(editor => ({
        ...editor,
        assignedCount: submissions.filter(sub =>
            (sub.status === 'ASSIGNED' || sub.status === 'assigned') &&
            sub.assigned_editor_id === editor.id &&
            isAssignedToday(sub) // Only count today's assignments
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
                return 'Used';
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

    // Tab-filtered submissions
    const tabConfig = TAB_OPTIONS.find(tab => tab.key === activeTab);
    const filteredSubmissions = submissions.filter(sub =>
        tabConfig.statuses.includes(sub.status)
    );

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
                {/* Header */}
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

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
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
                        <h3>Total Submissions</h3>
                        <p>{submissions.length}</p>
                    </div>
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
                </div>

                {/* Video Grid (Tab filtered) */}
                <div className="video-grid">
                    {filteredSubmissions.length === 0 ? (
                        <div className="no-submissions">
                            <h3>No submissions found</h3>
                            <p>Submissions will appear here automatically when volunteers submit videos.</p>
                        </div>
                    ) : (
                        filteredSubmissions.map((submission) => {
                            const dateClassification = getDateClassification(submission.received_at);
                            const dateTag = getDateTag(dateClassification);

                            return (
                                <div key={submission.id} className={`video-card status-${getStatusClass(submission.status)}`}>
                                    {/* Date Tag - Always Visible (No Hover) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        zIndex: 10,
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        backgroundColor: dateClassification === 'today' ? '#d4edda' :
                                            dateClassification === 'yesterday' ? '#fff3cd' : '#f8d7da',
                                        color: dateClassification === 'today' ? '#155724' :
                                            dateClassification === 'yesterday' ? '#856404' : '#721c24',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        pointerEvents: 'none' // Removes all hover effects completely
                                    }}>
                                        {dateTag.text}
                                    </div>

                                    <div className="video-preview">
                                        {submission.video_url ? (
                                            isApiVideoUrl(submission.video_url) ? (
                                                // Use iframe for api.video embed URLs
                                                <iframe
                                                    src={submission.video_url}
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
                                                    title={`Video by ${submission.volunteer_name}`}
                                                />
                                            ) : (
                                                // Fallback to HTML5 video for other URLs
                                                <video controls className="video-player">
                                                    <source src={submission.video_url} type="video/mp4" />
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
                                        <p><strong>Volunteer:</strong> {submission.volunteer_name}</p>
                                        <p><strong>Status:</strong>
                                            <span className={`status-badge status-${getStatusClass(submission.status)}`}>
                                                {getStatusText(submission.status)}
                                            </span>
                                        </p>
                                        <p><strong>Received:</strong> {formatDateTime(submission.received_at)}</p>
                                        <p><strong>ID:</strong> <code>{submission.id.slice(0, 8)}...</code></p>
                                        {submission.decline_reason && (
                                            <p><strong>Decline Reason:</strong> <em>{submission.decline_reason}</em></p>
                                        )}
                                    </div>

                                    {/* Action Section: Only show on pending_review and accepted tabs */}
                                    {(['pending_review', 'PENDING_REVIEW'].includes(submission.status) && activeTab === 'review') && (
                                        <div className="action-buttons">
                                            <button className="btn btn-accept" onClick={() => handleAccept(submission.id)}>
                                                ✓ Accept
                                            </button>
                                            <button className="btn btn-decline" onClick={() => handleDecline(submission.id)}>
                                                ✗ Decline
                                            </button>
                                        </div>
                                    )}

                                    {(submission.status === 'accepted' || submission.status === 'ACCEPTED') && activeTab === 'review' && (
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
                                                    onClick={() => handleAssign(submission.id)}
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
                                                        onClick={() => handleAssign(submission.id, editor.id)}
                                                        title={`Assign to ${editor.name}`}
                                                    >
                                                        {editor.name.split(' ').map(n => n[0]).join('')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Final Status Message for assigned/declined/used */}
                                    {(['assigned', 'ASSIGNED', 'declined', 'DECLINED', 'used', 'USED'].includes(submission.status)) && (
                                        <div className="final-status-message">
                                            <p>✓ This video has been processed.</p>
                                            {(['assigned', 'ASSIGNED'].includes(submission.status) && submission.assigned_editor_id) && (
                                                <p>
                                                    <small>
                                                        Assigned to: {editors.find(e => e.id === submission.assigned_editor_id)?.name || 'Unknown Editor'}
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
            </main>
            <aside className="dashboard-sidebar">
                <div className="sidebar-content">
                    <h2>Today's Editor Workload</h2>
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
