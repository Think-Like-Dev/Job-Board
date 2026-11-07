import { useParams, useNavigate } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { SearchBar } from './components/SearchBar';
import { SidebarFilters } from './components/SidebarFilters';
import { JobsList } from './components/JobsList';
import { JobDetailsDrawer } from './components/JobDetailsDrawer';
import { useJobSearch } from './useJobSearch';

export default function LandingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const search = useJobSearch();

  return (
    <div className="min-h-screen bg-muted/30">
      <HeroSection />
      <SearchBar value={search.search} onChange={search.setSearch} />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/4 shrink-0">
            <SidebarFilters
              category={search.category}
              onCategoryChange={search.setCategory}
              location={search.location}
              onLocationChange={search.setLocation}
              yearsOfExperience={search.yearsOfExperience}
              onYearsOfExperienceChange={search.setYearsOfExperience}
              currency={search.currency}
              onCurrencyChange={search.setCurrency}
              salaryRange={search.salaryRange}
              onSalaryRangeChange={search.setSalaryRange}
              onClear={search.clearFilters}
              isFiltered={search.isFiltered}
            />
          </div>

          <div className="w-full lg:w-3/4">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Open Positions
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Browse published jobs that are still accepting applications
                </p>
              </div>
            </div>

            <JobsList filters={search.filters} onPageChange={search.setPage} />
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
