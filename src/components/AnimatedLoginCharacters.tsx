"use client";

import { useState, useEffect, useRef } from "react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

interface AnimatedLoginCharactersProps {
  isTyping?: boolean;
  password?: string;
  showPassword?: boolean;
  emotion?: 'neutral' | 'happy' | 'sad' | 'wrong';
  isLoggingIn?: boolean;
}

export const AnimatedLoginCharacters: React.FC<AnimatedLoginCharactersProps> = ({
  isTyping = false,
  password = "",
  showPassword = false,
  emotion = 'neutral',
  isLoggingIn = false,
}) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isOrangeBlinking, setIsOrangeBlinking] = useState(false);
  const [isYellowBlinking, setIsYellowBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const [isNodding, setIsNodding] = useState(false);
  const [nodCycle, setNodCycle] = useState(0);
  const [purpleShakeDirection, setPurpleShakeDirection] = useState(0);
  const [isShrinking, setIsShrinking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  // Determine if typing password based on password field having content
  const isTypingPassword = password.length > 0;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking effect for purple character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for black character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for orange character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3500;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsOrangeBlinking(true);
        setTimeout(() => {
          setIsOrangeBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for yellow character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 4000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsYellowBlinking(true);
        setTimeout(() => {
          setIsYellowBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Looking at each other animation when typing starts
  useEffect(() => {
    if (isTyping && !isTypingPassword) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping, isTypingPassword]);

  // Nodding animation when typing password
  useEffect(() => {
    if (isTypingPassword && emotion !== 'wrong' && emotion !== 'sad') {
      setIsNodding(true);
      
      const nodInterval = setInterval(() => {
        setNodCycle((prev) => (prev + 1) % 4);
      }, 400);

      return () => {
        clearInterval(nodInterval);
        setIsNodding(false);
        setNodCycle(0);
      };
    } else {
      setIsNodding(false);
      setNodCycle(0);
    }
  }, [isTypingPassword, emotion]);

  // Shrinking animation when password is wrong or sad
  useEffect(() => {
    if (emotion === 'wrong' || emotion === 'sad') {
      setIsShrinking(true);
      const timer = setTimeout(() => {
        setIsShrinking(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [emotion]);

  // Purple head shake animation when wrong password
  useEffect(() => {
    if (emotion === 'wrong' || emotion === 'sad') {
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        if (shakeCount >= 6) {
          clearInterval(shakeInterval);
          setPurpleShakeDirection(0);
          return;
        }
        
        setPurpleShakeDirection((prev) => prev === 0 ? (shakeCount % 2 === 0 ? -1 : 1) : (prev === -1 ? 1 : -1));
        shakeCount++;
      }, 150);

      return () => {
        clearInterval(shakeInterval);
        setPurpleShakeDirection(0);
      };
    }
  }, [emotion]);

  // Purple sneaky peeking animation when typing password and it's visible
  useEffect(() => {
    if (password.length > 0 && showPassword && emotion !== 'wrong' && emotion !== 'sad') {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword, isPurplePeeking, emotion]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  // Calculate nod offset (vertical movement)
  const getNodOffset = () => {
    if (!isNodding) return 0;
    
    const phase = nodCycle / 4;
    return Math.sin(phase * Math.PI * 2) * 8;
  };

  const nodOffset = getNodOffset();

  // Get scale for shrinking animation
  const getShrinkScale = () => {
    if (isShrinking) {
      return 0.85;
    }
    return 1;
  };

  const shrinkScale = getShrinkScale();

  // Mouth shape helpers
  const getPurpleMouthStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      width: '35px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: '#1a1a1a',
      transition: 'all 0.3s ease-in-out',
    };

    if (emotion === 'wrong' || emotion === 'sad') {
      return {
        ...baseStyle,
        opacity: 0.3,
        transform: 'scaleY(0.5)',
      };
    }

    if (emotion === 'happy') {
      return {
        ...baseStyle,
        transform: 'scaleY(1.2)',
        height: '18px',
      };
    }

    return baseStyle;
  };

const getOrangeMouthStyle = () => {
  const baseStyle = {
    position: "absolute" as const,
    width: "30px",          // wider = cuter
    height: "14px",         // flatter oval
    backgroundColor: "transparent",
    transition: "all 240ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  // Sad / wrong → soft oval frown
  if (emotion === "wrong" || emotion === "sad") {
    return {
      ...baseStyle,
      borderTop: "5px solid #1a1a1a",          // thicker = softer
      borderRadius: "18px 18px 8px 8px",        // oval, not sharp
      transform: "scaleX(0.95) scaleY(0.9)",
    };
  }

  // Happy / neutral → cute oval smile
  return {
    ...baseStyle,
    borderBottom: "5px solid #1a1a1a",
    borderRadius: "15px 15px 30px 18px",          // oval smile
    transform: "scaleX(1.08) scaleY(1)",
  };
};



  const getBlackMouthStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      width: '24px',
      height: '14px',
      borderRadius: '50%',
      backgroundColor: '#1a1a1a',
      transition: 'all 0.3s ease-in-out',
    };

    // Black is sad when password is wrong
    if (emotion === 'wrong' || emotion === 'sad') {
      return {
        ...baseStyle,
        transform: 'scaleY(0.6) rotate(180deg)',
        height: '12px',
      };
    }

    if (emotion === 'happy') {
      return {
        ...baseStyle,
        transform: 'scaleY(1.1)',
        height: '16px',
      };
    }

    return baseStyle;
  };

  // Yellow wavy mouth when password is wrong
  const getYellowMouthPath = () => {
    if (emotion === 'wrong' || emotion === 'sad') {
      return (
        <svg
          width="80"
          height="20"
          viewBox="0 0 80 20"
          className="absolute transition-all duration-300 ease-in-out"
          style={{
            left: (password.length > 0 && showPassword) ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
            top: (password.length > 0 && showPassword) ? `${88}px` : `${88 + (yellowPos.faceY || 0)}px`,
          }}
        >
          <path
            d="M 0 10 Q 10 0, 20 10 T 40 10 T 60 10 T 80 10"
            stroke="#1a1a1a"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="animate-wave"
          />
        </svg>
      );
    }

    // Happy mouth when emotion is happy
    if (emotion === 'happy') {
      return (
        <div 
          className="absolute rounded-full transition-all duration-200 ease-out bg-[#1a1a1a]"
          style={{
            width: '80px',
            height: '16px',
            borderRadius: '50%',
            left: (password.length > 0 && showPassword) ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
            top: (password.length > 0 && showPassword) ? `${88}px` : `${88 + (yellowPos.faceY || 0) + nodOffset}px`,
            transform: 'scaleY(1.1)',
          }}
        />
      );
    }

    // Normal horizontal line for neutral
    return (
      <div 
        className="absolute rounded-full transition-all duration-200 ease-out bg-[#1a1a1a]"
        style={{
          width: '80px',
          height: '4px',
          left: (password.length > 0 && showPassword) ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
          top: (password.length > 0 && showPassword) ? `${88}px` : `${88 + (yellowPos.faceY || 0) + nodOffset}px`,
        }}
      />
    );
  };

  return (
    <div className="relative w-full h-full flex items-end justify-center">
      {/* Add keyframe animation for wavy mouth */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { d: path("M 0 10 Q 10 0, 20 10 T 40 10 T 60 10 T 80 10"); }
          50% { d: path("M 0 10 Q 10 20, 20 10 T 40 10 T 60 10 T 80 10"); }
        }
        .animate-wave {
          animation: wave 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* Cartoon Characters */}
      <div className="relative" style={{ width: '550px', height: '400px' }}>
        {/* Purple tall rectangle character - Back layer */}
        <div 
          ref={purpleRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '70px',
            width: '180px',
            height: (isTyping || (password.length > 0 && !showPassword)) ? '440px' : '400px',
            backgroundColor: '#7C4DFF',
            borderRadius: '10px 10px 0 0',
            zIndex: 1,
            transform: (password.length > 0 && showPassword)
              ? `skewX(0deg) scale(${shrinkScale})`
              : (isTyping || (password.length > 0 && !showPassword))
                ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px) scale(${shrinkScale})` 
                : `skewX(${purplePos.bodySkew || 0}deg) rotate(${purpleShakeDirection * 15}deg) scale(${shrinkScale})`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-8 transition-all duration-700 ease-in-out"
            style={{
              left: (password.length > 0 && showPassword) ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + purplePos.faceX}px`,
              top: (password.length > 0 && showPassword) ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + purplePos.faceY + nodOffset}px`,
            }}
          >
            <EyeBall 
              size={18} 
              pupilSize={7} 
              maxDistance={5} 
              eyeColor="white" 
              pupilColor="#1a1a1a" 
              isBlinking={isPurpleBlinking}
              forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
            <EyeBall 
              size={18} 
              pupilSize={7} 
              maxDistance={5} 
              eyeColor="white" 
              pupilColor="#1a1a1a" 
              isBlinking={isPurpleBlinking}
              forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
          </div>

          {/* Purple Mouth */}
          <div 
            style={{
              ...getPurpleMouthStyle(),
              left: (password.length > 0 && showPassword) ? `${73}px` : isLookingAtEachOther ? `${80}px` : `${73 + purplePos.faceX}px`,
              top: (password.length > 0 && showPassword) ? `${68}px` : isLookingAtEachOther ? `${95}px` : `${88 + purplePos.faceY + nodOffset}px`,
            }}
          />
        </div>

        {/* Black tall rectangle character - Middle layer */}
        <div 
          ref={blackRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '240px',
            width: '120px',
            height: '310px',
            backgroundColor: '#212121',
            borderRadius: '8px 8px 0 0',
            zIndex: 2,
            transform: (password.length > 0 && showPassword)
              ? `skewX(0deg) scale(${shrinkScale})`
              : isLookingAtEachOther
                ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px) scale(${shrinkScale})`
                : (isTyping || (password.length > 0 && !showPassword))
                  ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg) scale(${shrinkScale})` 
                  : `skewX(${blackPos.bodySkew || 0}deg) scale(${shrinkScale})`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-6 transition-all duration-700 ease-in-out"
            style={{
              left: (password.length > 0 && showPassword) ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + blackPos.faceX}px`,
              top: (password.length > 0 && showPassword) ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + blackPos.faceY + nodOffset}px`,
            }}
          >
            <EyeBall 
              size={16} 
              pupilSize={6} 
              maxDistance={4} 
              eyeColor="white" 
              pupilColor="#1a1a1a" 
              isBlinking={isBlackBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
            <EyeBall 
              size={16} 
              pupilSize={6} 
              maxDistance={4} 
              eyeColor="white" 
              pupilColor="#1a1a1a" 
              isBlinking={isBlackBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
          </div>

          {/* Black Mouth */}
          <div 
            style={{
              ...getBlackMouthStyle(),
              left: (password.length > 0 && showPassword) ? `${48}px` : isLookingAtEachOther ? `${48}px` : `${48 + blackPos.faceX}px`,
              top: (password.length > 0 && showPassword) ? `${58}px` : isLookingAtEachOther ? `${50}px` : `${58 + blackPos.faceY + nodOffset}px`,
            }}
          />
        </div>

        {/* Orange semi-circle character - Front left */}
        <div 
          ref={orangeRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '0px',
            width: '240px',
            height: '200px',
            zIndex: 3,
            backgroundColor: '#FF6F00',
            borderRadius: '120px 120px 0 0',
            transform: (password.length > 0 && showPassword) ? `skewX(0deg) scale(${shrinkScale})` : `skewX(${orangePos.bodySkew || 0}deg) scale(${shrinkScale})`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-8 transition-all duration-200 ease-out"
            style={{
              left: (password.length > 0 && showPassword) ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`,
              top: (password.length > 0 && showPassword) ? `${85}px` : `${90 + (orangePos.faceY || 0) + nodOffset}px`,
            }}
          >
            <EyeBall 
              size={12} 
              pupilSize={5} 
              maxDistance={4} 
              eyeColor="#1a1a1a" 
              pupilColor="#1a1a1a" 
              isBlinking={isOrangeBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} 
              forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} 
            />
            <EyeBall 
              size={12} 
              pupilSize={5} 
              maxDistance={4} 
              eyeColor="#1a1a1a" 
              pupilColor="#1a1a1a" 
              isBlinking={isOrangeBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} 
              forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} 
            />
          </div>

          {/* Orange Mouth */}
          <div 
            style={{
              ...getOrangeMouthStyle(),
              left: (password.length > 0 && showPassword) ? `${92}px` : `${106 + (orangePos.faceX || 0)}px`,
              top: (password.length > 0 && showPassword) ? `${135}px` : `${145 + (orangePos.faceY || 0) + nodOffset}px`,
            }}
          />
        </div>

        {/* Yellow tall rectangle character - Front right */}
        <div 
          ref={yellowRef}
          className="absolute bottom-0 transition-all duration-700 ease-in-out"
          style={{
            left: '310px',
            width: '140px',
            height: '230px',
            backgroundColor: '#FFD600',
            borderRadius: '70px 70px 0 0',
            zIndex: 4,
            transform: (password.length > 0 && showPassword) ? `skewX(0deg) scale(${shrinkScale})` : `skewX(${yellowPos.bodySkew || 0}deg) scale(${shrinkScale})`,
            transformOrigin: 'bottom center',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-6 transition-all duration-200 ease-out"
            style={{
              left: (password.length > 0 && showPassword) ? `${20}px` : `${52 + (yellowPos.faceX || 0)}px`,
              top: (password.length > 0 && showPassword) ? `${35}px` : `${40 + (yellowPos.faceY || 0) + nodOffset}px`,
            }}
          >
            <EyeBall 
              size={12} 
              pupilSize={5} 
              maxDistance={4} 
              eyeColor="#1a1a1a" 
              pupilColor="#1a1a1a" 
              isBlinking={isYellowBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} 
              forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} 
            />
            <EyeBall 
              size={12} 
              pupilSize={5} 
              maxDistance={4} 
              eyeColor="#1a1a1a" 
              pupilColor="#1a1a1a" 
              isBlinking={isYellowBlinking}
              forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} 
              forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} 
            />
          </div>
          
          {/* Yellow Mouth */}
          {getYellowMouthPath()}
        </div>
      </div>
    </div>
  );
};