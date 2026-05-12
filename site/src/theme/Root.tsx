import React from 'react';
// CSS will be pulled in via the package's sideEffects automatically
// when the JS entry is imported by MDX pages.
export default function Root({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
