export function HeroSection() {
  return (
    <section className="relative w-full h-[40vh] md:h-[70vh] bg-muted overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-linear-to-r from-primary/80 to-secondary/80 mix-blend-multiply z-10" />
      <img
        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2850"
        alt="Company Cover"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-20 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
          Find Your Dream Job
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium drop-shadow-md">
          Discover opportunities that match your skills and aspirations.
        </p>
      </div>
    </section>
  );
}
