 "use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";

export type MobileView = "conversations" | "chat" | "retarget";

interface UseMobileViewOptions {
  defaultView?: MobileView;
  breakpoint?: number;
}

interface UseMobileViewReturn {
  /** Current mobile view state */
  mobileView: MobileView;
  /** Set the mobile view */
  setMobileView: (view: MobileView) => void;
  /** Whether the device is mobile-sized */
  isMobile: boolean;
  /** Whether the device is tablet-sized */
  isTablet: boolean;
  /** Whether the device is desktop-sized */
  isDesktop: boolean;
  /** Navigate to chat view (mobile only) */
  navigateToChat: () => void;
  /** Navigate back to conversations (mobile only) */
  navigateToConversations: () => void;
  /** Handle back button press */
  handleBack: () => void;
  /** Scroll positions for preserving state */
  scrollPositions: {
    conversations: number;
    chat: number;
  };
  /** Save scroll position */
  saveScrollPosition: (view: "conversations" | "chat", position: number) => void;
  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Safe area insets for iOS notch handling */
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Breakpoints matching Tailwind defaults
const BREAKPOINTS = {
  mobile: 767,  // 0-767px
  tablet: 1023, // 768-1023px
  desktop: 1024, // 1024px+
} as const;

export function useMobileView(options: UseMobileViewOptions = {}): UseMobileViewReturn {
  const { defaultView = "conversations", breakpoint = BREAKPOINTS.mobile } = options;

  const [mobileView, setMobileViewState] = useState<MobileView>(defaultView);
  // Initialize based on window size if available (client-side)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= breakpoint;
    }
    return false; // SSR default
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      return width > breakpoint && width <= BREAKPOINTS.tablet;
    }
    return false;
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > BREAKPOINTS.tablet;
    }
    return true; // SSR default
  });
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [scrollPositions, setScrollPositions] = useState({
    conversations: 0,
    chat: 0,
  });
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  // Initialize viewport dimensions and breakpoint detection
  // Using useLayoutEffect to ensure this runs synchronously before paint
  // This prevents flash of wrong layout on initial render
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({ width, height });
      setIsMobile(width <= breakpoint);
      setIsTablet(width > breakpoint && width <= BREAKPOINTS.tablet);
      setIsDesktop(width > BREAKPOINTS.tablet);
    };

    // Initialize immediately
    updateViewport();

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[useMobileView] Initialized:', {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= breakpoint,
        breakpoint,
      });
    }

    // Listen for resize and orientation changes
    const handleResize = () => {
      updateViewport();
      if (process.env.NODE_ENV === 'development') {
        console.log('[useMobileView] Resize:', {
          width: window.innerWidth,
          isMobile: window.innerWidth <= breakpoint,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [breakpoint]);

  // Get safe area insets (for iOS notch handling)
  useEffect(() => {
    const getCSSVariable = (name: string): number => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name);
      return parseInt(value, 10) || 0;
    };

    const updateSafeAreaInsets = () => {
      // Try to get safe-area-inset values from CSS env()
      const root = document.documentElement;
      const style = getComputedStyle(root);
      
      // Create a temporary element to measure env() values
      const temp = document.createElement("div");
      temp.style.cssText = `
        position: fixed;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        visibility: hidden;
        pointer-events: none;
      `;
      document.body.appendChild(temp);
      
      const computedStyle = getComputedStyle(temp);
      setSafeAreaInsets({
        top: parseInt(computedStyle.paddingTop, 10) || 0,
        bottom: parseInt(computedStyle.paddingBottom, 10) || 0,
        left: parseInt(computedStyle.paddingLeft, 10) || 0,
        right: parseInt(computedStyle.paddingRight, 10) || 0,
      });
      
      document.body.removeChild(temp);
    };

    updateSafeAreaInsets();
    window.addEventListener("resize", updateSafeAreaInsets);
    
    return () => {
      window.removeEventListener("resize", updateSafeAreaInsets);
    };
  }, []);

  // Handle browser back button on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = (event: PopStateEvent) => {
      if (mobileView === "chat") {
        event.preventDefault();
        setMobileViewState("conversations");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobile, mobileView]);

  const setMobileView = useCallback((view: MobileView) => {
    setMobileViewState(view);
    
    // Push history state on mobile for back button support
    if (typeof window !== "undefined" && window.innerWidth <= BREAKPOINTS.mobile) {
      if (view === "chat") {
        window.history.pushState({ mobileView: view }, "", window.location.href);
      }
    }
  }, []);

  const navigateToChat = useCallback(() => {
    setMobileView("chat");
  }, [setMobileView]);

  const navigateToConversations = useCallback(() => {
    setMobileViewState("conversations");
  }, []);

  const handleBack = useCallback(() => {
    if (mobileView === "chat") {
      setMobileViewState("conversations");
    } else if (mobileView === "retarget") {
      setMobileViewState("conversations");
    }
  }, [mobileView]);

  const saveScrollPosition = useCallback((view: "conversations" | "chat", position: number) => {
    setScrollPositions((prev) => ({
      ...prev,
      [view]: position,
    }));
  }, []);

  return {
    mobileView,
    setMobileView,
    isMobile,
    isTablet,
    isDesktop,
    navigateToChat,
    navigateToConversations,
    handleBack,
    scrollPositions,
    saveScrollPosition,
    viewport,
    safeAreaInsets,
  };
}

// Utility hook for touch interactions
export function useTouchInteraction() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return null;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      return distanceX > 0 ? "left" : "right";
    }
    if (!isHorizontalSwipe && Math.abs(distanceY) > minSwipeDistance) {
      return distanceY > 0 ? "up" : "down";
    }
    return null;
  }, [touchStart, touchEnd]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    touchStart,
    touchEnd,
  };
}

// Utility hook for keyboard visibility (mobile)
export function useKeyboardVisibility() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use visualViewport API if available (modern browsers)
    const visualViewport = window.visualViewport;
    
    if (visualViewport) {
      const handleResize = () => {
        const heightDiff = window.innerHeight - visualViewport.height;
        const isVisible = heightDiff > 150; // Keyboard is typically > 150px
        
        setIsKeyboardVisible(isVisible);
        setKeyboardHeight(isVisible ? heightDiff : 0);
      };

      visualViewport.addEventListener("resize", handleResize);
      visualViewport.addEventListener("scroll", handleResize);
      
      return () => {
        visualViewport.removeEventListener("resize", handleResize);
        visualViewport.removeEventListener("scroll", handleResize);
      };
    }

    // Fallback for older browsers - use input focus/blur
    const handleFocus = () => setIsKeyboardVisible(true);
    const handleBlur = () => setIsKeyboardVisible(false);

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}

// CSS class utilities for responsive design
export const responsiveClasses = {
  // Mobile-first touch targets (min 44px)
  touchTarget: "min-h-[44px] min-w-[44px]",
  touchTargetSm: "min-h-[36px] min-w-[36px] md:min-h-[32px] md:min-w-[32px]",
  
  // Safe area padding
  safeAreaTop: "pt-[env(safe-area-inset-top)]",
  safeAreaBottom: "pb-[env(safe-area-inset-bottom)]",
  safeAreaLeft: "pl-[env(safe-area-inset-left)]",
  safeAreaRight: "pr-[env(safe-area-inset-right)]",
  safeAreaX: "px-[max(env(safe-area-inset-left),env(safe-area-inset-right))]",
  safeAreaY: "py-[max(env(safe-area-inset-top),env(safe-area-inset-bottom))]",
  
  // Hide/show based on breakpoints
  mobileOnly: "md:hidden",
  tabletUp: "hidden md:block",
  desktopOnly: "hidden lg:block",
  
  // Mobile full-screen views
  mobileFullScreen: "fixed inset-0 z-50 md:relative md:z-auto",
};

