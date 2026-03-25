import { useState, useRef, useEffect, type ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
}

export function ResizablePanel({
  children,
  defaultWidth = 640,
  minWidth = 320,
  maxWidth = 900,
  minHeight = 400,
}: ResizablePanelProps) {
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store drag state in refs to avoid stale closures
  const dragState = useRef<{
    edge: 'left' | 'right' | 'bottom' | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({ edge: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const handleMouseDown = (edge: 'left' | 'right' | 'bottom') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentHeight = panelHeight ?? containerRef.current?.parentElement?.clientHeight ?? 600;

    dragState.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panelWidth,
      startHeight: currentHeight,
    };

    document.body.style.cursor = edge === 'bottom' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { edge, startX, startY, startWidth, startHeight } = dragState.current;
      if (!edge) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (edge === 'left') {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
        setPanelWidth(newWidth);
      } else if (edge === 'right') {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
        setPanelWidth(newWidth);
      } else if (edge === 'bottom') {
        const newHeight = Math.max(minHeight, startHeight + deltaY);
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (dragState.current.edge) {
        dragState.current.edge = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    // Use capture phase to ensure we get events even if something else stops propagation
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    // Also listen for mouseleave on window in case mouse leaves browser
    window.addEventListener('blur', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('blur', handleMouseUp);
    };
  }, [minWidth, maxWidth, minHeight]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center"
      style={{
        height: panelHeight ? panelHeight + 24 : '100%', // Extra space for bottom handle
        maxHeight: '100%',
      }}
    >
      <div className="flex items-center flex-1 min-h-0">
        {/* Left resize handle */}
        <div
          onMouseDown={handleMouseDown('left')}
          className="w-1 h-16 bg-gray-300 rounded-full cursor-ew-resize opacity-60 hover:opacity-100 hover:bg-gray-400 transition-opacity flex-shrink-0 mr-2"
        />

        {/* Main panel */}
        <div
          className="relative bg-white rounded-2xl shadow-xl overflow-hidden h-full flex-shrink-0"
          style={{ width: panelWidth }}
        >
          {children}
        </div>

        {/* Right resize handle */}
        <div
          onMouseDown={handleMouseDown('right')}
          className="w-1 h-16 bg-gray-300 rounded-full cursor-ew-resize opacity-60 hover:opacity-100 hover:bg-gray-400 transition-opacity flex-shrink-0 ml-2"
        />
      </div>

      {/* Bottom resize handle */}
      <div
        onMouseDown={handleMouseDown('bottom')}
        className="w-16 h-1 bg-gray-300 rounded-full cursor-ns-resize opacity-60 hover:opacity-100 hover:bg-gray-400 transition-opacity mt-2 flex-shrink-0"
      />
    </div>
  );
}
