import { useState } from 'react';
import { Label } from '@ui/label';
import { Checkbox } from '@ui/checkbox';
import { Slider } from '@ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion';

const SALARY_MIN = 0;
const SALARY_MAX = 300;
const SALARY_STEP = 5;

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

function formatSalary(value: number): string {
  if (value >= 1000) return `$${value}K`;
  return `$${value}K`;
}

export function SidebarFilters() {
  const [salaryRange, setSalaryRange] = useState<number[]>([30, 150]);

  return (
    <aside className="w-full h-full">
      <div className="sticky top-24 space-y-6 bg-card border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg tracking-tight">Filters</h3>

        {/* ── Salary Range ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Salary Range</h4>

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span className="bg-muted px-2 py-1 rounded font-semibold text-foreground">
              {formatSalary(salaryRange[0])}
            </span>
            <span className="text-muted-foreground/60">–</span>
            <span className="bg-muted px-2 py-1 rounded font-semibold text-foreground">
              {formatSalary(salaryRange[1])}
            </span>
          </div>

          <Slider
            value={salaryRange}
            min={SALARY_MIN}
            max={SALARY_MAX}
            step={SALARY_STEP}
            onValueChange={(val:any) => setSalaryRange(val)}
            className="w-full"
          />

          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>{formatSalary(SALARY_MIN)}</span>
            <span>{formatSalary(SALARY_MAX)}+</span>
          </div>
        </div>

        <div className="border-t" />

        {/* ── Checkbox filters ─────────────────────────────────────── */}
        <Accordion>
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
