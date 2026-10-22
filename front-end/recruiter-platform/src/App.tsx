import { TooltipProvider } from "@ui/tooltip";
import { Toaster } from "@ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./routes/AppRoutes";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAuthBootstrap } from "@api/hooks/useAuth";
import "./i18n/config";
import "./App.css";

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
  useAuthBootstrap();
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
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
