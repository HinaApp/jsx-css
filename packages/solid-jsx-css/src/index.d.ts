import { JSXElement } from "solid-js";

export function styled(element: JSXElement):
  (template: { raw: readonly string[] | ArrayLike<string>; }, ...substitutions: any[]) => JSXElement;
