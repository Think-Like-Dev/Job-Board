import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, MapPin, Briefcase, DollarSign, Share2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { apiClient } from '../../../api/apiClient';
import { API_ENDPOINTS } from '../../../api/endpoints.config';

interface Job {
  id: string;
  title: string;
  category: string;
  location: string;
  experience: string;
  salaryRange: string;
  description: string;
  isBookmarked: boolean;
  postedAt: string;
}

export function JobCard({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(job.isBookmarked);

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      // Simulate API call
      return await apiClient.post(API_ENDPOINTS.JOBS.BOOKMARK(job.id));
    },
    onMutate: () => {
      // Optimistic update
      setIsBookmarked(!isBookmarked);
    },
    onError: () => {
      // Revert on error
      setIsBookmarked(!isBookmarked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/jobs/${job.id}`;
    navigator.clipboard.writeText(url);
    // You could show a toast here
  };

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div>
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
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark.mutate();
              }}
            >
              {isBookmarked ? (
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
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            {job.experience}
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            {job.salaryRange}
          </div>
        </div>

        <p className="text-sm line-clamp-2 text-foreground/80">
          {job.description}
        </p>

        <div className="flex gap-2">
          <Badge variant="secondary">React</Badge>
          <Badge variant="secondary">TypeScript</Badge>
        </div>
      </div>
    </Card>
  );
}

export function JobsList() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.JOBS.GET_ALL);
      return res as Job[];
    }
  });

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

  return (
    <div className="space-y-4">
      {jobs?.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
      
      {/* Basic Pagination Placeholder */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="flex gap-2">
          <Button variant="outline" disabled>Previous</Button>
          <Button variant="outline" className="bg-primary text-primary-foreground">1</Button>
          <Button variant="outline">2</Button>
          <Button variant="outline">Next</Button>
        </div>
      </div>
    </div>
  );
}
