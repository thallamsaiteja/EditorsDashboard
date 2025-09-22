import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Editor.css'; // We will create this file next

// --- Mock Data for the Editor ---
const mockAssignedTasks = [
  { 
    id: 'task001', 
    videoTitle: 'Community Report from Ameerpet',
    volunteerName: 'Imran Pasha', 
    assignedAt: '2025-09-22T09:00:00Z', 
    sourceVideoUrl: 'https://example.com/source1.mp4',
    status: 'assigned'
  },
  { 
    id: 'task002', 
    videoTitle: 'Local Market Story',
    volunteerName: 'Jane Doe', 
    assignedAt: '2025-09-22T09:05:00Z', 
    sourceVideoUrl: 'https://example.com/source2.mp4',
    status: 'assigned'
  },
  { 
    id: 'task003', 
    videoTitle: 'Interview with Local Artist',
    volunteerName: 'John Smith', 
    assignedAt: '2025-09-21T15:30:00Z', 
    sourceVideoUrl: 'https://example.com/source3.mp4',
    status: 'completed',
    editedVideoUrl: 'https://example.com/edited3.mp4',
    completedAt: '2025-09-22T11:00:00Z'
  },
  { 
    id: 'task004', 
    videoTitle: 'Traffic Update from HITECH City',
    volunteerName: 'Sarah Lee', 
    assignedAt: '2025-09-21T12:00:00Z', 
    sourceVideoUrl: 'https://example.com/source4.mp4',
    status: 'assigned'
  },
];

export default function EditorPage() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('assigned'); // 'assigned' or 'completed'
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editedUrl, setEditedUrl] = useState('');

  useEffect(() => {
    setTasks(mockAssignedTasks);
  }, []);

  const handleOpenModal = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
    setEditedUrl('');
  };

  const handleSubmit = () => {
    if (!editedUrl) {
      alert('Please provide the edited video URL.');
      return;
    }
    setTasks(tasks.map(task => 
      task.id === selectedTask.id 
        ? { ...task, status: 'completed', editedVideoUrl: editedUrl, completedAt: new Date().toISOString() } 
        : task
    ));
    handleCloseModal();
  };

  const filteredTasks = tasks.filter(task => task.status === currentView);
  
  // Stats for the sidebar
  const assignedCount = tasks.filter(t => t.status === 'assigned').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="editor-dashboard-layout">
      {/* --- Main Content Area --- */}
      <main className="editor-dashboard-main">
        <header className="editor-dashboard-header">
          <h1>Editor Dashboard</h1>
          <p>Your assigned video editing tasks.</p>
        </header>
        
        {/* --- Filter Tabs --- */}
        <div className="editor-tabs">
          <button 
            className={`tab-button ${currentView === 'assigned' ? 'active' : ''}`}
            onClick={() => setCurrentView('assigned')}
          >
            Assigned ({assignedCount})
          </button>
          <button 
            className={`tab-button ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => setCurrentView('completed')}
          >
            Completed ({completedCount})
          </button>
        </div>
        
        {/* --- Task Grid --- */}
        <div className="task-grid">
          {filteredTasks.map(task => (
            <div key={task.id} className={`task-card status--${task.status}`}>
              <div className="task-card__preview">
                Video Preview
              </div>
              <div className="task-card__details">
                <h3 className="task-card__title">{task.videoTitle}</h3>
                <p className="task-card__meta">From: {task.volunteerName}</p>
                <p className="task-card__meta">
                  {task.status === 'assigned' ? 'Assigned' : 'Completed'}: {new Date(task.assignedAt).toLocaleString()}
                </p>
                {task.status === 'completed' && (
                  <p className="task-card__meta--completed">
                    Edited URL: <a href={task.editedVideoUrl} target="_blank" rel="noopener noreferrer">View Final Video</a>
                  </p>
                )}
              </div>
              {task.status === 'assigned' && (
                <div className="task-card__actions">
                  <button className="btn btn--submit" onClick={() => handleOpenModal(task)}>
                    Submit Edited Video
                  </button>
                </div>
              )}
            </div>
          ))}
           {filteredTasks.length === 0 && (
            <p className="no-tasks-message">No {currentView} tasks found.</p>
          )}
        </div>
      </main>
      
      {/* --- Sidebar --- */}
      <aside className="editor-dashboard-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-profile__avatar">E</div>
            <h2 className="sidebar-profile__name">Editor Name</h2>
            <p className="sidebar-profile__email">editor@kaizernews.com</p>
          </div>
          <div className="sidebar-stats">
              <h3 className="sidebar-title">Your Stats</h3>
              <div className="stat-item">
                  <span className="stat-item__label">Pending Tasks</span>
                  <span className="stat-item__value">{assignedCount}</span>
              </div>
               <div className="stat-item">
                  <span className="stat-item__label">Completed Tasks</span>
                  <span className="stat-item__value">{completedCount}</span>
              </div>
          </div>
          <Link to="/" className="sidebar-link">Back to Home</Link>
      </aside>

      {/* --- URL Submission Modal --- */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Submit Edited Video</h2>
            <p>For task: <strong>{selectedTask?.videoTitle}</strong></p>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="https://example.com/edited_video.mp4"
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={handleCloseModal}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}