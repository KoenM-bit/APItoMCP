import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import Generator from './components/Generator';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/generator" element={<Generator />} />
          <Route path="/dashboard" element={<div className="p-8 text-center">Dashboard coming soon</div>} />
          <Route path="/settings" element={<div className="p-8 text-center">Settings coming soon</div>} />
          <Route path="/profile" element={<div className="p-8 text-center">Profile coming soon</div>} />
          <Route path="/help" element={<div className="p-8 text-center">Help coming soon</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;