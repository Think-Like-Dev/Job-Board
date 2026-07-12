import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ApplicationsTab } from './components/ApplicationsTab';
import { BookmarksTab } from './components/BookmarksTab';

export default function ApplicationsPage() {
  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Activity</h1>
        <p className="text-muted-foreground mt-2">Track your job applications and saved opportunities.</p>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="bookmarks">Saved Jobs</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="bookmarks">
          <BookmarksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
