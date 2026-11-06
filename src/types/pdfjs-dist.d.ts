declare module "pdfjs-dist/build/pdf" {
  export function getDocument(src: {
    data: Uint8Array;
    disableWorker?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }) => { promise: Promise<void> };
      }>;
      destroy: () => Promise<void>;
    }>;
    destroy: () => void;
  };
}
