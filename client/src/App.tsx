import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import TrendsPage from './pages/TrendsPage';
import AgentsPage from './pages/AgentsPage';
import MemoryPage from './pages/MemoryPage';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import NotificationPanel from './components/NotificationPanel';
import LearningPage from './pages/LearningPage';
import ReportsPage from './pages/ReportsPage';
import CommandCenterPage from './pages/CommandCenterPage';
import { Menu } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SecuritySettings from './pages/SecuritySettings';
import { KaruppuLogo } from './components/KaruppuLogo';

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
        <IntelligenceProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="flex bg-nova-bg text-nova-text min-h-screen selection:bg-red-500/30 selection:text-white relative overflow-x-hidden">
                  {/* Mobile Header Bar */}
                  <header className="fixed top-0 left-0 right-0 h-16 glass z-50 flex lg:hidden items-center px-4 sm:px-6 border-b border-white/5 justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-red-400 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                      >
                        <Menu size={22} />
                      </button>
                      <h1 className="text-xl font-black tracking-tighter text-white uppercase truncate flex items-center gap-2">
                        <KaruppuLogo size={22} />
                        <span className="font-karuppu text-[20px]">Karuppu</span>
                        <span className="text-[9px] font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded ml-1 border border-red-800/40">v6.0</span>
                      </h1>
                    </div>
                    <NotificationPanel />
                  </header>

                  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                  {/* Content Engine */}
                  <main className="flex-1 min-w-0 lg:pl-64 transition-all duration-500 relative flex flex-col items-center">

                    {/* Background Atmosphere - deep red tones */}
                    <div className="fixed top-0 right-0 w-[300px] sm:w-[600px] lg:w-[900px] h-[300px] sm:h-[600px] lg:h-[900px] bg-red-900/10 blur-[80px] sm:blur-[120px] lg:blur-[200px] rounded-full -mr-32 sm:-mr-64 lg:-mr-128 -mt-32 sm:-mt-64 lg:-mt-128 pointer-events-none z-0 opacity-60"></div>
                    <div className="fixed bottom-0 left-0 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-red-950/10 blur-[60px] sm:blur-[100px] rounded-full -ml-16 sm:-ml-32 -mb-16 sm:-mb-32 pointer-events-none z-0 opacity-40"></div>

                    {/* Page Content */}
                    <div className="relative z-10 pt-20 lg:pt-8 px-4 sm:px-6 lg:px-10 w-full max-w-[1500px] pb-24">
                      <Routes>
                        <Route path="/" element={<CommandCenterPage />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/trends" element={<TrendsPage />} />
                        <Route path="/agents" element={<AgentsPage />} />
                        <Route path="/memory" element={<MemoryPage />} />
                        <Route path="/intelligence" element={<IntelligenceDashboard />} />
                        <Route path="/learning" element={<LearningPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/security" element={<SecuritySettings />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </IntelligenceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
