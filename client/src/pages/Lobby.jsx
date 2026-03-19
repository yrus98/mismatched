import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function Lobby() {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('room_created', (code) => {
      navigate(`/room/${code}`);
    });

    socket.on('room_joined', (code) => {
      navigate(`/room/${code}`);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('error');
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    socket.emit('create_room');
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomCode.trim().length === 4) {
      socket.emit('join_room', roomCode.toUpperCase());
    } else {
      setError('Room code must be 4 characters');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content} className="glass-panel animate-fade-in">
        <h1 style={styles.title}>
          <span style={{ color: 'var(--accent-primary)' }}>MIS</span>
          <span style={{ color: 'var(--accent-secondary)' }}>MATCHED</span>
        </h1>
        <p style={styles.subtitle}>A Co-op Drawing Experience</p>

        <div style={styles.actionContainer}>
          <button 
            className="btn-primary animate-pulse-slow" 
            onClick={handleCreateRoom}
            style={{ width: '100%', marginBottom: '24px' }}
          >
            Create New Room
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine}></span>
            <span style={styles.dividerText}>OR</span>
            <span style={styles.dividerLine}></span>
          </div>

          <form onSubmit={handleJoinRoom} style={styles.joinForm}>
            <input 
              type="text" 
              placeholder="ROOM CODE" 
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button 
              type="submit" 
              className="btn-secondary" 
              style={{ marginTop: '16px', width: '100%' }}
            >
              Join Room
            </button>
          </form>

          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    padding: '20px',
    background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
  },
  content: {
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '3rem',
    fontWeight: '800',
    letterSpacing: '-1px',
    marginBottom: '8px',
    textAlign: 'center',
    lineHeight: '1.1'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    marginBottom: '40px',
    textAlign: 'center',
    fontWeight: '500'
  },
  actionContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '16px 0 32px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  dividerText: {
    color: 'var(--text-secondary)',
    padding: '0 16px',
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  joinForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  error: {
    color: 'var(--accent-secondary)',
    marginTop: '16px',
    fontWeight: '600',
    fontSize: '0.875rem'
  }
};
