import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import { PaymentSuccess } from './components/PaymentSuccess';
import { AuthCallback } from './components/AuthCallback';
import { AccessPage } from './components/AccessPage';
import { AuthProvider } from './contexts/AuthContext';

// Wrapper component to handle /user-center route
const UserCenterPage: React.FC = () => {
  const navigate = useNavigate();
  return <App initialPage="user-center" onNavigateHome={() => navigate('/')} />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/user-center" element={<UserCenterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/access" element={<AccessPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);