import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { ApplicationsTab } from './components/ApplicationsTab';
import { BookmarksTab } from './components/BookmarksTab';

export default function ApplicationsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('applications.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('applications.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="applications">
            {t('applications.tabs.applications')}
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            {t('applications.tabs.bookmarks')}
          </TabsTrigger>
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
