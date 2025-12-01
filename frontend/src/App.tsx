import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import MaintenanceMode from './components/MaintenanceMode';

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Check if maintenance mode is enabled
  const maintenanceValue = import.meta.env.VITE_MAINTENANCE_MODE;
  const isMaintenanceMode = maintenanceValue === 'true';

  // Temporary debugging
  console.log('VITE_MAINTENANCE_MODE:', maintenanceValue);
  console.log('isMaintenanceMode:', isMaintenanceMode);
  console.log('All env vars:', import.meta.env);

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
