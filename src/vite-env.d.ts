/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';
  type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; color?: string; strokeWidth?: number | string; className?: string };
  type Icon = FC<IconProps>;
  const icons: Record<string, Icon>;
  export const SkipForward: Icon;
  export const RotateCcw: Icon;
  export const Home: Icon;
  export const Play: Icon;
  export const Users: Icon;
  export const Bot: Icon;
  export const Wifi: Icon;
  export const ChevronRight: Icon;
  export const Scan: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const Check: Icon;
  export const X: Icon;
  export const Loader2: Icon;
  export const Trophy: Icon;
  export const Crown: Icon;
  export const AlertCircle: Icon;
  export default icons;
}
