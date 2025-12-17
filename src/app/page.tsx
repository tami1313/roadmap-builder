'use client';

import { useState, useEffect } from 'react';
import RoadmapBuilder from '@/components/RoadmapBuilder';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedAuth = sessionStorage.getItem('roadmap_editor_authenticated');
    if (storedAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const correctPassword = process.env.NEXT_PUBLIC_ROADMAP_EDITOR_PASSWORD || 'MASPMroadmapeditor';

    if (password === correctPassword) {
      setAuthenticated(true);
      sessionStorage.setItem('roadmap_editor_authenticated', 'true');
    } else {
      setError('Incorrect password');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Roadmap Editor</h2>
          <p className="text-sm text-gray-600 mb-6 text-center">Please enter the password to access the editor</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Enter Editor
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <RoadmapBuilder />;
}

