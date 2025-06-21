import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, LogOut, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, logout, token } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success('JWT token copied to clipboard');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600">You are successfully authenticated</p>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <User className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-semibold text-gray-900">User Information</h3>
                </div>
            <div className="space-y-2">
                <div>
                <span className="text-sm text-gray-600">Email:</span>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* JWT Token Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">JWT Token</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Your JWT token is securely stored and valid for 24 hours.
              </p>
              <button
                onClick={copyToken}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Copy JWT Token
              </button>
            </div>
          </div>

          {/* Logout Button */}
            <button
              onClick={handleLogout}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors duration-200 flex items-center justify-center"
            >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
            </button>
          </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-green-800 text-center">
            ✅ Your session is secure and protected with JWT authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;