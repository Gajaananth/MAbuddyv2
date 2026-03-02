import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import TrendsPage from './pages/TrendsPage';
import AgentsPage from './pages/AgentsPage';
import MemoryPage from './pages/MemoryPage';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import NotificationPanel from './components/NotificationPanel';
import { Menu } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SecuritySettings from './pages/SecuritySettings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-nova-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!isAuthenticated) return <LoginPage />;
  return <>{children}</>;
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex bg-nova-bg text-nova-text min-h-screen selection:bg-nova-accent/30 selection:text-white overflow-x-hidden relative">
                {/* Mobile Header Bar - Fixed for consistency */}
                <header className="fixed top-0 left-0 right-0 h-20 glass z-50 flex lg:hidden items-center px-4 sm:px-6 border-b border-nova-border/50 justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="p-2 sm:p-3 -ml-1 sm:-ml-2 text-nova-accent hover:bg-white/10 rounded-2xl active:scale-90 transition-all shadow-lg"
                    >
                      <Menu size={24} />
                    </button>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase truncate">Zium <span className="text-nova-accent">Nova</span></h1>
                  </div>
                  <div className="scale-90 origin-right">
                    <NotificationPanel />
                  </div>
                </header>

                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                {/* Content Engine - Offset by Sidebar width on Desktop */}
                <main className="flex-1 min-w-0 lg:pl-80 transition-all duration-300 relative min-h-screen">
                  {/* Background Atmosphere - Fixed width and better positioning to avoid horizontal scrolling */}
                  <div className="fixed top-0 right-0 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-nova-accent/10 blur-[100px] sm:blur-[180px] rounded-full -mr-48 sm:-mr-96 -mt-48 sm:-mt-96 pointer-events-none z-0"></div>
                  <div className="fixed bottom-0 left-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-nova-accent-alt/10 blur-[80px] sm:blur-[150px] rounded-full -ml-16 sm:-ml-32 -mb-16 sm:-mb-32 pointer-events-none z-0"></div>

                  {/* Atomic Content Container */}
                  <div className="relative z-10 pt-24 sm:pt-28 lg:pt-20 px-4 sm:px-8 md:px-12 lg:px-16 min-h-screen flex flex-col items-stretch w-full max-w-full overflow-x-hidden">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/trends" element={<TrendsPage />} />
                      <Route path="/agents" element={<AgentsPage />} />
                      <Route path="/memory" element={<MemoryPage />} />
                      <Route path="/intelligence" element={<IntelligenceDashboard />} />
                      <Route path="/security" element={<SecuritySettings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
