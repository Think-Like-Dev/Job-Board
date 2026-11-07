import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  Share2,
} from 'lucide-react';
import { useJobsList } from '@api/hooks/useJobs';
import type { JobFilters, JobSummary } from '@/types/job.types';
import { EmploymentType } from '@/types/job.types';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Skeleton } from '@ui/skeleton';
import { formatCompensation, formatIsoDate } from '@/lib/jobFormat';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full time',
  [EmploymentType.PART_TIME]: 'Part time',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.INTERN]: 'Internship',
};

export function JobCard({ job }: { job: JobSummary }) {
  const navigate = useNavigate();
  const { isBookmarked, toggleBookmark } = useLocalBookmarks();
  const bookmarked = isBookmarked(job.id);
  const compensation = formatCompensation(job.compensation);
  const postedAt = job.publishedAt ?? job.createdAt;

  const handleShare = (event: React.MouseEvent) => {
    event.stopPropagation();
    const url = `${window.location.origin}/jobs/${job.id}`;
    void navigator.clipboard.writeText(url);
  };

  return (
    <Card
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <p className="text-muted-foreground mt-1">{job.category}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleShare}
              aria-label="Share job"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-primary"
              onClick={(event) => {
                event.stopPropagation();
                toggleBookmark(job);
              }}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-6 h-6 fill-primary text-primary" />
              ) : (
                <Bookmark className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {job.location}
          </div>
          {job.yearsOfExperience && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {job.yearsOfExperience}
            </div>
          )}
          {compensation && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              {compensation}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatIsoDate(postedAt)}
          </div>
        </div>

        <p className="text-sm line-clamp-2 text-foreground/80">
          {job.description}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {EMPLOYMENT_LABELS[job.employmentType]}
          </Badge>
          {job.keywords.slice(0, 4).map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

interface JobsListProps {
  filters: JobFilters;
  onPageChange: (page: number) => void;
}

export function JobsList({ filters, onPageChange }: JobsListProps) {
  const { data, isLoading } = useJobsList(filters);
  const jobs = data?.data ?? [];
  const pagination = data?.pagination;
  const currentPage = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-16 w-full mt-4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        No jobs match your filters.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}

      <div className="flex items-center justify-between gap-2 pt-4">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
