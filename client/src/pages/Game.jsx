import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import DrawingBoard from '../components/DrawingBoard';
import { Palette, Eraser, MoveRight } from 'lucide-react';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const boardRef = useRef(null);
  
  const [gameState, setGameState] = useState('waiting'); // waiting, drawing, reveal
  const [playersCounter, setPlayersCounter] = useState(1);
  const [role, setRole] = useState(null);
  const [prompt, setPrompt] = useState('');
  
  // Drawing Tools State
  const [color, setColor] = useState('#F8FAFC'); // white by default
  const [size, setSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const colors = ['#F8FAFC', '#F43F5E', '#3B82F6', '#10B981', '#F59E0B'];

  useEffect(() => {
    // If we land here but socket isn't connected or we don't have role
    // we should ideally re-fetch state. For this simple demo, we just rely on socket events.
    
    socket.on('player_joined', (count) => {
      setPlayersCounter(count);
    });

    socket.on('game_started', (data) => {
      setGameState('drawing');
      setPrompt(data.prompt);
      setRole(data.roles[socket.id]);
    });

    socket.on('reveal_started', () => {
      setGameState('reveal');
    });

    socket.on('player_left', () => {
      // If someone leaves in a 2 player game, reset or go home
      alert('The other player left the game.');
      navigate('/');
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('reveal_started');
      socket.off('player_left');
    };
  }, [navigate]);

  useEffect(() => {
    if (gameState === 'drawing' && timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (gameState === 'drawing' && timeLeft === 0) {
      socket.emit('reveal', roomId);
    }
  }, [gameState, timeLeft, roomId]);

  const handleSaveImage = () => {
    const dataUrl = boardRef.current?.getImage();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `mismatched-${roomId}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const startGame = () => {
    // A daily or random prompt generator
    const prompts = ["A Fancy Cat in a Spacesuit", "A Dragon Eating Pizza", "A Mermaid on a Skateboard"];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    socket.emit('start_game', roomId, randomPrompt);
  };

  if (gameState === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.waitingBox} className="glass-panel animate-fade-in">
          <h2>Room: <span style={{ color: 'var(--accent-primary)', letterSpacing: '2px' }}>{roomId}</span></h2>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
            Waiting for player 2... ({playersCounter}/2)
          </p>
          {playersCounter === 2 && (
            <button className="btn-primary animate-pulse-slow" onClick={startGame} style={{ marginTop: '24px' }}>
              Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.gameContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.timerBox}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 5 ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>
        <div style={styles.promptBox}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Draw this:</p>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>{prompt}</h3>
        </div>
      </header>

      {/* Canvas Area */}
      <div style={styles.canvasContainer}>
        <DrawingBoard 
          ref={boardRef}
          roomId={roomId} 
          role={role} 
          color={isEraser ? '#0F172A' : color} 
          size={size} 
          gameState={gameState}
        />
      </div>

      {/* Toolbar */}
      {gameState === 'drawing' && (
        <footer style={styles.toolbar} className="animate-slide-down">
          <div style={styles.toolsRow}>
            {colors.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                style={{
                  ...styles.colorBtn,
                  backgroundColor: c,
                  border: color === c && !isEraser ? '3px solid var(--accent-primary)' : '2px solid transparent'
                }}
              />
            ))}
            <div style={styles.separator} />
            <button
              onClick={() => setIsEraser(true)}
              style={{
                ...styles.iconBtn,
                color: isEraser ? 'var(--accent-primary)' : 'var(--text-primary)',
                background: isEraser ? 'rgba(139, 92, 246, 0.2)' : 'transparent'
              }}
            >
              <Eraser size={24} />
            </button>
          </div>
          <div style={styles.sliderRow}>
            <input 
              type="range" 
              min="2" 
              max="20" 
              value={size} 
              onChange={(e) => setSize(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>
        </footer>
      )}

      {/* Reveal Overlay */}
      {gameState === 'reveal' && (
        <div style={styles.revealOverlay} className="animate-fade-in glass-panel">
          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(139,92,246,0.6)' }}>
            TA-DA!
          </h1>
          <p style={{ marginTop: '16px', fontSize: '1.2rem' }}>A true masterpiece.</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button className="btn-primary" onClick={handleSaveImage}>
              Save to Gallery
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              Play Again
            </button>
          </div>
        </div>
      )}
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
  },
  waitingBox: {
    padding: '40px',
    textAlign: 'center',
  },
  gameContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    gap: '16px',
    background: 'var(--bg-panel)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    zIndex: 10
  },
  timerBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  promptBox: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    background: 'var(--bg-primary)'
  },
  toolbar: {
    flex: 'none',
    padding: '16px',
    background: 'var(--bg-panel)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: 'env(safe-area-inset-bottom, 16px)'
  },
  toolsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px'
  },
  colorBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  separator: {
    width: '1px',
    height: '32px',
    background: 'rgba(255,255,255,0.1)',
    margin: '0 8px'
  },
  iconBtn: {
    border: 'none',
    cursor: 'pointer',
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  sliderRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 16px'
  },
  slider: {
    width: '100%',
    maxWidth: '300px',
    accentColor: 'var(--accent-primary)'
  },
  revealOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100,
    textAlign: 'center',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};
