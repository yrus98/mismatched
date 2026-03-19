import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './App.css'; // Optional component-specific styles if needed

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
