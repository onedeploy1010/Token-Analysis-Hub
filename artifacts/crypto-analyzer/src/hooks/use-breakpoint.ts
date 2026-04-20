import { useState, useEffect, useMemo } from "react";

// 断点定义 (与 Tailwind CSS 保持一致)
export const BREAKPOINTS = {
  xs: 0,      // < 480px: 小手机
  sm: 480,    // 480-639px: 手机
  md: 640,    // 640-767px: 大手机/小平板
  lg: 768,    // 768-1023px: 平板
  xl: 1024,   // 1024-1279px: 小桌面
  "2xl": 1280, // >= 1280px: 大桌面
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface BreakpointState {
  // 当前断点名称
  breakpoint: Breakpoint;
  // 当前窗口宽度
  width: number;
  // 设备类型判断
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1023px
  isDesktop: boolean;     // >= 1024px
  isSmallMobile: boolean; // < 480px
  isLargeDesktop: boolean; // >= 1280px
  // 断点比较函数
  isAbove: (bp: Breakpoint) => boolean;
  isBelow: (bp: Breakpoint) => boolean;
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
}

/**
 * 响应式断点 Hook
 * 提供当前屏幕尺寸信息和设备类型判断
 */
export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1024; // SSR 默认值
  });

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // 使用 ResizeObserver 获得更好的性能
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        // 使用 document body 的宽度变化来检测视口变化
        if (entries[0]) {
          setWidth(window.innerWidth);
        }
      });
      observer.observe(document.body);
      return () => observer.disconnect();
    } else {
      // 降级方案
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const state = useMemo<BreakpointState>(() => {
    // 确定当前断点
    let currentBreakpoint: Breakpoint = "xs";
    const breakpointEntries = Object.entries(BREAKPOINTS) as [Breakpoint, number][];

    for (const [name, minWidth] of breakpointEntries) {
      if (width >= minWidth) {
        currentBreakpoint = name;
      }
    }

    // 设备类型判断
    const isMobile = width < BREAKPOINTS.lg;
    const isTablet = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
    const isDesktop = width >= BREAKPOINTS.xl;
    const isSmallMobile = width < BREAKPOINTS.sm;
    const isLargeDesktop = width >= BREAKPOINTS["2xl"];

    // 断点比较函数
    const isAbove = (bp: Breakpoint) => width >= BREAKPOINTS[bp];
    const isBelow = (bp: Breakpoint) => width < BREAKPOINTS[bp];
    const isBetween = (min: Breakpoint, max: Breakpoint) =>
      width >= BREAKPOINTS[min] && width < BREAKPOINTS[max];

    return {
      breakpoint: currentBreakpoint,
      width,
      isMobile,
      isTablet,
      isDesktop,
      isSmallMobile,
      isLargeDesktop,
      isAbove,
      isBelow,
      isBetween,
    };
  }, [width]);

  return state;
}

/**
 * 简化版 Hook - 只返回设备类型
 */
export function useDeviceType() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  return { isMobile, isTablet, isDesktop };
}

/**
 * 获取响应式值
 * @example
 * const columns = useResponsiveValue({ mobile: 1, tablet: 2, desktop: 3 });
 */
export function useResponsiveValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}): T {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  return useMemo(() => {
    if (isDesktop && values.desktop !== undefined) return values.desktop;
    if (isTablet && values.tablet !== undefined) return values.tablet;
    if (isMobile && values.mobile !== undefined) return values.mobile;
    return values.default;
  }, [isMobile, isTablet, isDesktop, values]);
}
