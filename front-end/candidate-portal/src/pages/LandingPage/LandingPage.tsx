import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroSection } from './components/HeroSection';
import { SearchBar } from './components/SearchBar';
import { FiltersDialog } from './components/FiltersDialog';
import { JobBrowser } from './components/JobBrowser';
import { useJobSearch } from './useJobSearch';

export default function LandingPage() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const search = useJobSearch();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearch = () => {
    document
      .getElementById('job-browser')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <HeroSection />

      <SearchBar
        value={search.search}
        onChange={search.setSearch}
        onFilterClick={() => setFiltersOpen(true)}
        onSearch={handleSearch}
        hasActiveFilters={search.hasActiveFilters}
      />

      <FiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={search.filterValues}
        onApply={search.applyFilters}
        onClear={search.clearJobFilters}
      />

      <div id="job-browser" className="2xl:container mx-auto min-w-10/12 px-4 py-12 ">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t('jobs.openPositions')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('jobs.openPositionsSubtitle')}
            </p>
          </div>
        </div>

        <JobBrowser
          filters={search.filters}
          initialJobId={jobId}
          onPageChange={search.setPage}
        />
      </div>
    </div>
  );
}
