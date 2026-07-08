'use client';

import dynamic from 'next/dynamic';

// Lazy-load Three.js particle background only on the client
const ParticleBackground = dynamic(
  () => import('@/components/ui/ParticleBackground'),
  { ssr: false }
);

export default function ThemeBackground() {
  return <ParticleBackground />;
}
