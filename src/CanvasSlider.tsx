import React, { useRef, useEffect, useState, useCallback, memo } from "react";

type CanvasSliderProps = {
  images: string[];
  backgroundColor: string;
};

// Utility function to draw an image on the canvas
// while maintaining its aspect ratio and centering it.
// xOffset allows positioning images side-by-side during dragging.
type DrawImageFitProps = {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  xOffset: number;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string; // Make it optional with a default value in the function
};

const drawImageFit = ({ ctx, img, xOffset, canvasWidth, canvasHeight, backgroundColor = "#F2F2F2" }: DrawImageFitProps): void => {
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let drawX = 0;
  let drawY = 0;

  if (imgRatio > canvasRatio) {
    // Image is wider than canvas: fit width
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller than canvas: fit height
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
    drawX = (canvasWidth - drawWidth) / 2;
  }

  // Fill background to prevent flicker and apply padding if needed
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(xOffset, 0, canvasWidth, canvasHeight);

  // Draw the image at the computed size and position
  ctx.drawImage(img, drawX + xOffset, drawY, drawWidth, drawHeight);
};

export const CanvasSlider: React.FC<CanvasSliderProps> = ({ images, backgroundColor = "#F2F2F2" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Refs to manage mutable state without re-renders
  const startXRef = useRef(0); // X-coordinate at drag start
  const scrollRef = useRef(0); // Total horizontal scroll (pixels)
  const animationFrame = useRef<number | null>(null); // Used to batch drawing with requestAnimationFrame

  // Draws the currently visible slide(s) onto the canvas
  const drawCurrentImages = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current!;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const slideWidth = width;
      const slideIndex = Math.floor(scrollRef.current / slideWidth); // Which slide is currently visible
      const offset = scrollRef.current % slideWidth; // How far into the next slide we are

      const current = loadedImages[slideIndex];
      const next = loadedImages[slideIndex + 1];

      if (current) drawImageFit({ ctx, img: current, xOffset: -offset, canvasWidth: width, canvasHeight: height, backgroundColor });
      if (next) drawImageFit({ ctx, img: next, xOffset: width - offset, canvasWidth: width, canvasHeight: height, backgroundColor });
    },
    [loadedImages, backgroundColor]
  );

  // Preload all images in parallel on mount
  useEffect(() => {
    const loadImages = async () => {
      const loaded = await Promise.all(
        images.map(
          (src) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.src = src;
              img.onload = () => resolve(img);
              img.onerror = reject;
            })
        )
      );
      setLoadedImages(loaded);
    };

    loadImages();
  }, [images]);

  // Adjust canvas size and scale for device pixel ratio
  // Redraw images after resize to ensure correct positioning
  useEffect(() => {
    if (!loadedImages.length) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.scale(dpr, dpr); // Scale for high-DPI screens
      drawCurrentImages(ctx);
    };

    resizeCanvas(); // Initial resize
    window.addEventListener("resize", resizeCanvas); // Re-resize on window change
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [loadedImages, drawCurrentImages]);

  // Mouse drag interaction
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      startXRef.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !loadedImages.length) return;

      const { width } = canvas.getBoundingClientRect();
      const dx = e.clientX - startXRef.current;
      startXRef.current = e.clientX;

      const maxScroll = (loadedImages.length - 1) * width;
      scrollRef.current = Math.max(0, Math.min(scrollRef.current - dx, maxScroll));

      // Limit to one animation frame per draw cycle
      if (animationFrame.current === null) {
        animationFrame.current = requestAnimationFrame(() => {
          drawCurrentImages(ctx);
          animationFrame.current = null;
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    // Attach listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      // clean up listeners
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, loadedImages, drawCurrentImages]);

  return (
    <div style={{ width: "640px", height: "400px", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          outline: "1px solid #ccc",
          cursor: isDragging ? "grabbing" : "grab", // UX: cursor changes during drag
        }}
      />
    </div>
  );
};

export default memo(CanvasSlider);
