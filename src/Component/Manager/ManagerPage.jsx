import React, { useState, useEffect } from 'react';
import './ManagerPage.css';

// Added more mock data to show the assignment counts
const mockSubmissions = [
    { id: 'sub123', volunteerName: 'Imran Pasha', receivedAt: '2025-09-18T12:30:00Z', videoUrl: 'https://cdn.api.video/vod/vi420j2j2j2j2j2j2j2/hls/manifest.m3u8', status: 'pending' },
    { id: 'sub124', volunteerName: 'Jane Doe', receivedAt: '2025-09-18T12:32:00Z', videoUrl: 'https://cdn.api.video/vod/vi531k3k3k3k3k3k3k3/hls/manifest.m3u8', status: 'pending' },
    { id: 'sub125', volunteerName: 'John Smith', receivedAt: '2025-09-18T12:35:00Z', videoUrl: 'https://cdn.api.video/vod/vi642l4l4l4l4l4l4l4/hls/manifest.m3u8', status: 'pending' },
    { id: 'sub126', volunteerName: 'Sarah Lee', receivedAt: '2025-09-18T12:36:00Z', videoUrl: 'https://cdn.api.video/vod/vi753m5m5m5m5m5m5m5/hls/manifest.m3u8', status: 'pending' },
    { id: 'sub127', volunteerName: 'Alex Turner', receivedAt: '2025-09-18T12:37:00Z', videoUrl: 'https://cdn.api.video/vod/vi864n6n6n6n6n6n6n6n/hls/manifest.m3u8', status: 'pending' },
];

const mockEditors = [
    { id: 'edit456', name: 'Editor Alice' },
    { id: 'edit789', name: 'Editor Bob' },
];

function ManagerPage() {
    const [submissions, setSubmissions] = useState([]);
    const [editors] = useState(mockEditors);
    const [selectedEditor, setSelectedEditor] = useState('');

    useEffect(() => {
        setSubmissions(mockSubmissions);
    }, []);

    // --- Action Handlers (no changes here) ---
    const handleAccept = (submissionId) => {
        updateSubmissionStatus(submissionId, 'accepted_assign_pending');
    };
    const handleDecline = (submissionId) => {
        const reason = prompt("Please provide a reason for declining this video:");
        if (reason) updateSubmissionStatus(submissionId, 'declined');
    };
    const handleAssign = (submissionId) => {
        if (!selectedEditor) {
            alert('Please select an editor to assign the video to.');
            return;
        }
        updateSubmissionStatus(submissionId, `assigned_to_${selectedEditor}`);
        setSelectedEditor(''); // Reset dropdown for the next assignment
    };
    const updateSubmissionStatus = (id, newStatus) => {
        setSubmissions(prevSubmissions =>
            prevSubmissions.map(sub =>
                sub.id === id ? { ...sub, status: newStatus } : sub
            )
        );
    };

    // --- Calculate assignment counts for the sidebar ---
    const editorAssignmentCounts = editors.map(editor => {
        const count = submissions.filter(sub => sub.status === `assigned_to_${editor.id}`).length;
        return { ...editor, assignedCount: count };
    });

    const getStatusText = (status) => {
        if (status === 'pending') return 'Pending Review';
        if (status === 'accepted_assign_pending') return 'Accepted, Assign Pending';
        if (status.startsWith('assigned_to_')) return 'Assigned';
        return 'Declined';
    };

    return (
        <div className="manager-dashboard-layout">

            {/* Main Content Area */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>Video Submission Dashboard</h1>
                    <p>Review and assign incoming videos from volunteers.</p>
                </header>

                <div className="video-grid">
                    {submissions.map((submission) => (
                        <div key={submission.id} className={`video-card status-${submission.status}`}>
                            {/* ... (video card content is the same as before) ... */}
                            <div className="video-preview">
                                <div className="player-placeholder">
                                    <p>Video Preview</p>
                                </div>
                            </div>
                            <div className="video-info">
                                <p><strong>Volunteer:</strong> {submission.volunteerName}</p>
                                <p><strong>Status:</strong> <span className="status-text">{getStatusText(submission.status)}</span></p>
                            </div>
                            {submission.status === 'pending' && (
                                <div className="action-buttons">
                                    <button className="btn btn-accept" onClick={() => handleAccept(submission.id)}>Accept</button>
                                    <button className="btn btn-decline" onClick={() => handleDecline(submission.id)}>Decline</button>
                                </div>
                            )}
                            {submission.status === 'accepted_assign_pending' && (
                                <div className="assignment-section">
                                    <select className="editor-dropdown" onChange={(e) => setSelectedEditor(e.target.value)} value={selectedEditor}>
                                        <option value="">-- Select Editor --</option>
                                        {editors.map(editor => (
                                            <option key={editor.id} value={editor.id}>{editor.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-assign" onClick={() => handleAssign(submission.id)}>Assign</button>
                                </div>
                            )}
                            {(submission.status.startsWith('assigned') || submission.status === 'declined') && (
                                <div className="final-status-message">
                                    <p>This video has been processed.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* Sidebar for Editor Information */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-content">
                    <h2>Editor Workload</h2>
                    <ul className="editors-list">
                        {editorAssignmentCounts.map(editor => (
                            <li key={editor.id} className="editor-item">
                                <span className="editor-name">{editor.name}</span>
                                <span className="editor-count">{editor.assignedCount} assigned</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}

export default ManagerPage;
