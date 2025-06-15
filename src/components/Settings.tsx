import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Key, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';

const Settings: React.FC = () => {
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
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences and security settings</p>
          </div>

          {/* Settings Cards */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Notifications</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email notifications</div>
                    <div className="text-sm text-gray-600">Receive updates about your projects</div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Deployment alerts</div>
                    <div className="text-sm text-gray-600">Get notified when deployments complete</div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Security</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Two-factor authentication</div>
                    <div className="text-sm text-gray-600">Add an extra layer of security</div>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">API keys</div>
                    <div className="text-sm text-gray-600">Manage your API access keys</div>
                  </div>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Integrations</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Hugging Face API</div>
                    <div className="text-sm text-gray-600">Connect your Hugging Face account</div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Claude Desktop</div>
                    <div className="text-sm text-gray-600">Configure Claude Desktop integration</div>
                  </div>
                  <Button variant="outline" size="sm">Setup</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Preferences</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-gray-600">Choose your preferred theme</div>
                  </div>
                  <Button variant="outline" size="sm">Light</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Default language</div>
                    <div className="text-sm text-gray-600">Set default code generation language</div>
                  </div>
                  <Button variant="outline" size="sm">Python</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;