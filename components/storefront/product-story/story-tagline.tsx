interface StoryTaglineProps {
  tagline: string;
}

export function StoryTagline({ tagline }: StoryTaglineProps) {
  return (
    <div className="mx-auto max-w-[800px] px-6 text-center">
      <p className="text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
        {tagline}
      </p>
    </div>
  );
}
