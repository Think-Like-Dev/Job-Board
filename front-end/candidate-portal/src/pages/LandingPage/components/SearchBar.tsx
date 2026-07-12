import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

export function SearchBar() {
  return (
    <div className="w-full max-w-4xl mx-auto -mt-8 relative z-30 px-4">
      <div className="bg-background rounded-full shadow-lg border p-2 flex items-center gap-2">
        <div className="flex-1 flex items-center pl-4">
          <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
          <Input
            type="text"
            placeholder="Search for job title, keywords, or company..."
            className="border-0 shadow-none focus-visible:ring-0 text-base"
          />
        </div>
        <Button size="lg" className="rounded-full px-8 shrink-0">
          Search
        </Button>
      </div>
    </div>
  );
}
