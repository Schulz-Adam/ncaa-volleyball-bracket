import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import MaintenanceMode from './components/MaintenanceMode';

function App() {
  const { initAuth } = useAuthStore();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check maintenance mode from JSON file
    fetch('/maintenance.json')
      .then(res => res.json())
      .then(data => {
        setIsMaintenanceMode(data.enabled === true);
        setIsLoading(false);
      })
      .catch(() => {
        // If fetch fails, assume not in maintenance mode
        setIsMaintenanceMode(false);
        setIsLoading(false);
      });

    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (isMaintenanceMode) {
    return <MaintenanceMode />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
