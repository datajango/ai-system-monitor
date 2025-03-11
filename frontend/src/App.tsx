// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppProvider } from "./context/AppContext.tsx";

// Layouts
import MainLayout from "./components/layout/MainLayout.tsx";

// Pages
import HomePage from "./pages/HomePage.tsx";
import SnapshotsPage from "./pages/SnapshotsPage.tsx";
import SnapshotDetailPage from "./pages/SnapshotDetailPage.tsx";
import AnalysisPage from "./pages/AnalysisPage.tsx";
import ConfigPage from "./pages/ConfigPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="snapshots" element={<SnapshotsPage />} />
              <Route path="snapshots/:id" element={<SnapshotDetailPage />} />
              <Route path="analysis/:id" element={<AnalysisPage />} />
              <Route path="config" element={<ConfigPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
