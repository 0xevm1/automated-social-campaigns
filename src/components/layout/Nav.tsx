import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function PlusDocIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M11 2v6h6" />
      <path d="M10 13v-4" />
      <path d="M8 11h4" />
    </svg>
  );
}

function ClockListIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l2.5 2.5" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg">
          Campaign Dashboard
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" render={<Link href="/campaigns/new" />}>
          <PlusDocIcon className="size-4" />
          New Campaign
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/campaigns/recent" />}>
          <ClockListIcon className="size-4" />
          Recent Campaigns
        </Button>
      </div>
    </header>
  );
}
