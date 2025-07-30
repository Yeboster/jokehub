
"use client";

import Image from 'next/image';
import type { FC } from 'react';

interface LogoProps {
  width: number;
  className?: string;
  priority?: boolean;
}

const LOGO_ASPECT_RATIO = 312 / 1395;

const Logo: FC<LogoProps> = ({ width, className, priority = false }) => {
  const height = Math.round(width * LOGO_ASPECT_RATIO);

  return (
    <Image
      src="/logo.png"
      alt="Joke Hub Logo"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
};

export default Logo;
