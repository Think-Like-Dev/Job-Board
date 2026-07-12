import { useParams, useNavigate } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { SearchBar } from './components/SearchBar';
import { SidebarFilters } from './components/SidebarFilters';
import { JobsList } from './components/JobsList';
import { JobDetailsDrawer } from './components/JobDetailsDrawer';

export default function LandingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  // The JobCard already handles updating URL via Link or push state,
  // but if we navigate to /jobs/:id, LandingPage mounts and we show the drawer.

  return (
    <div className="min-h-screen bg-muted/30">
      <HeroSection />
      <SearchBar />
      
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/4 shrink-0">
            <SidebarFilters />
          </div>
          
          <div className="w-full lg:w-3/4">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Recommended Jobs</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Based on your profile and search history
                </p>
              </div>
            </div>
            
            <JobsList />
          </div>
        </div>
      </div>

      <JobDetailsDrawer 
        jobId={jobId || ''} 
        isOpen={!!jobId} 
        onClose={() => navigate('/')} 
      />
    </div>
  );
}
