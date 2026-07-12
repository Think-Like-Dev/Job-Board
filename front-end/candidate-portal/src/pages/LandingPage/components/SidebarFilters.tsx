import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../components/ui/accordion';

const filterCategories = [
  {
    id: 'category',
    title: 'Department',
    options: ['Engineering', 'Design', 'Marketing', 'Sales', 'Product'],
  },
  {
    id: 'location',
    title: 'Location',
    options: ['Remote', 'New York, NY', 'San Francisco, CA', 'London, UK'],
  },
  {
    id: 'experience',
    title: 'Experience Level',
    options: ['Entry Level', '1-3 years', '3-5 years', '5+ years'],
  },
];

export function SidebarFilters() {
  return (
    <aside className="w-full h-full">
      <div className="sticky top-24 space-y-6 bg-card border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg tracking-tight">Filters</h3>
        
        <Accordion type="multiple" defaultValue={['category', 'location']} className="w-full">
          {filterCategories.map((category) => (
            <AccordionItem value={category.id} key={category.id} className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-3">
                <span className="font-medium text-sm">{category.title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-1">
                  {category.options.map((option) => (
                    <div key={option} className="flex items-center space-x-3">
                      <Checkbox id={`${category.id}-${option}`} />
                      <Label
                        htmlFor={`${category.id}-${option}`}
                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </aside>
  );
}
