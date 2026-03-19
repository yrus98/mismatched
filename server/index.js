const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app built output
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all in dev
    methods: ["GET", "POST"]
  }
});

// Game State Management
const rooms = {};

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', () => {
    const code = generateRoomCode();
    rooms[code] = {
      players: [socket.id],
      state: 'lobby', // lobby, drawing, reveal
      roles: { [socket.id]: 'top' }
    };
    socket.join(code);
    socket.emit('room_created', code);
    console.log(`Room ${code} created by ${socket.id}`);
  });

  socket.on('join_room', (code) => {
    const room = rooms[code];
    if (room && room.players.length < 2 && room.state === 'lobby') {
      room.players.push(socket.id);
      room.roles[socket.id] = 'bottom';
      socket.join(code);
      socket.emit('room_joined', code);
      io.to(code).emit('player_joined', room.players.length);
      console.log(`${socket.id} joined room ${code}`);
    } else {
      socket.emit('error', 'Room full or invalid');
    }
  });

  socket.on('start_game', (code, prompt) => {
    const room = rooms[code];
    if (room && room.players.length === 2 && room.players[0] === socket.id) {
      room.state = 'drawing';
      room.prompt = prompt;
      room.donePlayers = new Set();
      io.to(code).emit('game_started', { prompt, roles: room.roles });
    }
  });

  socket.on('draw_line', ({ code, line }) => {
    // Broadcast the drawing line to the OTHER player in the room
    socket.to(code).emit('receive_line', line);
  });

  socket.on('player_done', (code) => {
    const room = rooms[code];
    if (room && room.state === 'drawing') {
      if (!room.donePlayers) room.donePlayers = new Set();
      room.donePlayers.add(socket.id);
      
      io.to(code).emit('player_done_count', room.donePlayers.size);

      if (room.donePlayers.size === 2) {
        room.state = 'reveal';
        io.to(code).emit('reveal_started');
      }
    }
  });

  socket.on('reveal', (code) => {
    const room = rooms[code];
    if (room && room.state === 'drawing') {
      room.state = 'reveal';
      io.to(code).emit('reveal_started');
    }
  });

  socket.on('play_again', (code) => {
    const room = rooms[code];
    if (room && room.state === 'reveal') {
      room.state = 'lobby';
      io.to(code).emit('game_reset');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup simple implementation
    for (const code in rooms) {
      const room = rooms[code];
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(code).emit('player_left');
        if (room.players.length === 0) {
          delete rooms[code];
        }
      }
    }
  });
});

// The "catchall" handler: for any request that doesn't 
// match one above, send back React's index.html file.
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
