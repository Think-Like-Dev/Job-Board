import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
}

export function ExperienceTable() {
  const [experiences, setExperiences] = useState<Experience[]>([
    {
      id: '1',
      company: 'Tech Corp',
      title: 'Frontend Engineer',
      startDate: '2020-06-01',
      endDate: '2023-01-01',
    }
  ]);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Work Experience</h3>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Experience
        </Button>
      </div>
      
      {experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work experience added yet.</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {experiences.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.company}</TableCell>
                  <TableCell>{exp.title}</TableCell>
                  <TableCell>{new Date(exp.startDate).getFullYear()} - {new Date(exp.endDate).getFullYear()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
