import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeablePagesProps {
  children: ReactNode[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
  pageClassName?: string;
  swipeThreshold?: number;
}

export function SwipeablePages({
  children,
  currentPage: controlledPage,
  onPageChange,
  showIndicators = true,
  showArrows = false,
  className,
  pageClassName,
  swipeThreshold = 50,
}: SwipeablePagesProps) {
  const [internalPage, setInternalPage] = useState(0);
  const currentPage = controlledPage ?? internalPage;
  const totalPages = children.length;
  const containerRef = useRef<HTMLDivElement>(null);

  const setPage = (page: number) => {
    const newPage = Math.max(0, Math.min(page, totalPages - 1));
    if (controlledPage === undefined) {
      setInternalPage(newPage);
    }
    onPageChange?.(newPage);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0 && currentPage > 0) {
        setPage(currentPage - 1);
      } else if (offset.x < 0 && currentPage < totalPages - 1) {
        setPage(currentPage + 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 0) {
        setPage(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages - 1) {
        setPage(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(0);

  const paginate = (newPage: number) => {
    setDirection(newPage > currentPage ? 1 : -1);
    setPage(newPage);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Content Area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden flex-1 min-h-0"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentPage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "w-full h-full overflow-y-auto",
              "-webkit-overflow-scrolling: touch",
              pageClassName
            )}
          >
            {children[currentPage]}
          </motion.div>
        </AnimatePresence>

        {/* Arrow Navigation (Optional) */}
        {showArrows && totalPages > 1 && (
          <>
            {currentPage > 0 && (
              <button
                onClick={() => paginate(currentPage - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <button
                onClick={() => paginate(currentPage + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Page Indicators */}
      {showIndicators && totalPages > 1 && (
        <div className="page-indicators">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => paginate(index)}
              className={cn(
                "page-indicator",
                index === currentPage ? "active" : "inactive"
              )}
              aria-label={`Go to page ${index + 1}`}
              aria-current={index === currentPage ? "page" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 简化版 - 用于帮助说明弹窗
interface HelpPagesProps {
  pages: {
    title: string;
    icon?: ReactNode;
    content: ReactNode;
  }[];
  className?: string;
}

export function HelpPages({ pages, className }: HelpPagesProps) {
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with current page title */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {pages[currentPage]?.icon}
          <span className="app-text-subtitle">{pages[currentPage]?.title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentPage + 1} / {pages.length}
        </span>
      </div>

      {/* Swipeable Content */}
      <SwipeablePages
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        className="flex-1 min-h-0 pt-4"
        pageClassName="px-1"
      >
        {pages.map((page, index) => (
          <div key={index} className="space-y-3">
            {page.content}
          </div>
        ))}
      </SwipeablePages>
    </div>
  );
}

// 结果分页组件 - 用于模拟结果展示
interface ResultPagesProps {
  pages: {
    title: string;
    subtitle?: string;
    content: ReactNode;
  }[];
  className?: string;
}

export function ResultPages({ pages, className }: ResultPagesProps) {
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Tab-style header */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
        {pages.map((page, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index)}
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all",
              index === currentPage
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {page.title}
          </button>
        ))}
      </div>

      {/* Subtitle if exists */}
      {pages[currentPage]?.subtitle && (
        <p className="text-xs text-muted-foreground mb-3">
          {pages[currentPage].subtitle}
        </p>
      )}

      {/* Swipeable Content */}
      <SwipeablePages
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showIndicators={false}
        className="flex-1"
      >
        {pages.map((page, index) => (
          <div key={index}>{page.content}</div>
        ))}
      </SwipeablePages>
    </div>
  );
}
