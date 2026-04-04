import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Briefcase, Users, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search drives, students, applications..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Drives">
          <CommandItem onSelect={() => go("/drives")}>
            <Briefcase className="mr-2 h-4 w-4" /> Google SDE Intern 2026
          </CommandItem>
          <CommandItem onSelect={() => go("/drives")}>
            <Briefcase className="mr-2 h-4 w-4" /> Microsoft SWE Full-time
          </CommandItem>
          <CommandItem onSelect={() => go("/drives")}>
            <Briefcase className="mr-2 h-4 w-4" /> Amazon SDE-1
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Students">
          <CommandItem onSelect={() => go("/students")}>
            <Users className="mr-2 h-4 w-4" /> Aarav Patel — CSE 2026
          </CommandItem>
          <CommandItem onSelect={() => go("/students")}>
            <Users className="mr-2 h-4 w-4" /> Priya Sharma — CSE 2026
          </CommandItem>
          <CommandItem onSelect={() => go("/students")}>
            <Users className="mr-2 h-4 w-4" /> Meera Joshi — CSE 2026
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go("/")}>
            <Search className="mr-2 h-4 w-4" /> Overview Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/applications")}>
            <FileText className="mr-2 h-4 w-4" /> Applications Tracker
          </CommandItem>
          <CommandItem onSelect={() => go("/analytics")}>
            <Search className="mr-2 h-4 w-4" /> Analytics
          </CommandItem>
          <CommandItem onSelect={() => go("/announcements")}>
            <Search className="mr-2 h-4 w-4" /> Announcements
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
