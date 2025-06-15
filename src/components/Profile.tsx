import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Award, Settings, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          </div>

          {/* Profile Card */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center space-x-6">
                <img
                  src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=3b82f6&color=fff&size=128`}
                  alt={userProfile.displayName}
                  className="w-24 h-24 rounded-full"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{userProfile.displayName}</h2>
                  <p className="text-gray-600">{userProfile.email}</p>
                  <div className="flex items-center space-x-4 mt-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      userProfile.plan === 'pro' 
                        ? 'bg-blue-100 text-blue-800'
                        : userProfile.plan === 'enterprise'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userProfile.plan} Plan
                    </span>
                    <span className="text-sm text-gray-500">
                      Member since {new Date(userProfile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{userProfile.projectCount}</div>
                <div className="text-gray-600">Projects Created</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{userProfile.usage.serversGenerated}</div>
                <div className="text-gray-600">Servers Generated</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{userProfile.usage.deploymentsCreated}</div>
                <div className="text-gray-600">Deployments</div>
              </CardContent>
            </Card>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Account Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{userProfile.displayName}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{userProfile.email}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Created
                  </label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(userProfile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Login
                  </label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(userProfile.lastLoginAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Details */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Usage Statistics</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Endpoints Used</div>
                  <div className="text-2xl font-bold text-gray-900">{userProfile.usage.endpointsUsed}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Servers Generated</div>
                  <div className="text-2xl font-bold text-gray-900">{userProfile.usage.serversGenerated}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Deployments Created</div>
                  <div className="text-2xl font-bold text-gray-900">{userProfile.usage.deploymentsCreated}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;