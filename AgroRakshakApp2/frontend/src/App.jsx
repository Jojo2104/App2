import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import DetectionInterface from './components/DiseaseDetection/DetectionInterface';
import DetectionHistory from './components/History/DetectionHistory';
import Dashboard from './components/Dashboard/Dashboard';
import Navbar from './components/Navigation/Navbar';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { currentUser } = useAuth();
  
  return (
    <>
      {currentUser && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/detect" 
          element={
            <ProtectedRoute>
              <DetectionInterface />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <DetectionHistory />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
