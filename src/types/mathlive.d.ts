import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { MathfieldElement, MathfieldElementAttributes } from "mathlive";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<
        HTMLAttributes<MathfieldElement>,
        MathfieldElement
      > &
        Partial<MathfieldElementAttributes> & {
          "default-mode"?: "inline-math" | "math" | "text";
          "math-virtual-keyboard-policy"?: "auto" | "manual" | "sandboxed";
          "smart-fence"?: boolean | "on" | "off";
          "smart-mode"?: boolean | "on" | "off";
        };
    }
  }
}
