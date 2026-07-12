export function Footer() {
  return (
    <footer className="h-16 border-t flex items-center justify-center shrink-0 text-sm text-muted-foreground bg-background">
      <p>&copy; {new Date().getFullYear()} Job Board. All rights reserved.</p>
    </footer>
  );
}
