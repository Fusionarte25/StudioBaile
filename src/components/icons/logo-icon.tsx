import type { SVGProps } from 'react';

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2a10 10 0 0 0-3.91 19.86" />
      <path d="M22 12a10 10 0 0 0-19.86 3.91" />
      <path d="M12 22a10 10 0 0 0 3.91-19.86" />
      <path d="M2 12a10 10 0 0 0 19.86-3.91" />
      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
      <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  );
}

    