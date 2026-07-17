import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@ui/tooltip';
import { store } from './store';
import AppRoutes from './routes/AppRoutes';
import { Header } from './components/shared/Header';
import { Footer } from './components/shared/Footer';
import { useSSE } from './hooks/useSSE';
import './i18n/config';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});
function AppContent() {
  useSSE();
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Header />
          <main className="flex-1 relative">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
