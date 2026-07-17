import { useState } from 'react';
import { Button } from '@ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
}

export function EducationTable() {
  const [educations] = useState<Education[]>([
    {
      id: '1',
      institution: 'University of Technology',
      degree: 'Bachelors',
      fieldOfStudy: 'Computer Science',
      startDate: '2016-08-01',
      endDate: '2020-05-01',
      grade: '3.8 GPA',
    }
  ]);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Education</h3>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Education
        </Button>
      </div>
      
      {educations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No education history added yet.</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead>Degree & Field</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {educations.map((edu) => (
                <TableRow key={edu.id}>
                  <TableCell className="font-medium">{edu.institution}</TableCell>
                  <TableCell>{edu.degree} in {edu.fieldOfStudy}</TableCell>
                  <TableCell>{new Date(edu.startDate).getFullYear()} - {new Date(edu.endDate).getFullYear()}</TableCell>
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
