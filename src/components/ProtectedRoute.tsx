import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Preloader from './Preloader';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Show the premium logo animation while checking if the user is logged in
  if (loading) {
    return <Preloader isLoading={true} />;
  }

  // If not logged in, boot them to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, let them through
  return <Outlet />;
}