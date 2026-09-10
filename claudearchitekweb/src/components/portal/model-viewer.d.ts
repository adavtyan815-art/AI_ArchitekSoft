import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  "ios-src"?: string;
  alt?: string;
  poster?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-scale"?: string;
  "ar-placement"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: string | number;
  "rotation-per-second"?: string;
  "touch-action"?: string;
  "shadow-intensity"?: string | number;
  exposure?: string | number;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "manual";
  "environment-image"?: string;
  "camera-orbit"?: string;
  "interaction-prompt"?: string;
  style?: CSSProperties;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}

export {};
