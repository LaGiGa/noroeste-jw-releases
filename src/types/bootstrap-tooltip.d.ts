declare module 'bootstrap/js/dist/tooltip' {
  export default class Tooltip {
    constructor(element: Element, options?: unknown);
    static getInstance(element: Element): Tooltip | null;
    dispose(): void;
  }
}
