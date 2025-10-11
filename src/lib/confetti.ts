export const triggerConfetti = (element: HTMLElement) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const confettiCount = 50;
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < confettiCount; i++) {
    createConfettiPiece(centerX, centerY, colors[Math.floor(Math.random() * colors.length)]);
  }
};

const createConfettiPiece = (x: number, y: number, color: string) => {
  const confetti = document.createElement('div');
  confetti.className = 'confetti-piece';
  confetti.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background-color: ${color};
    left: ${x}px;
    top: ${y}px;
    opacity: 1;
    pointer-events: none;
    z-index: 9999;
    border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
  `;

  document.body.appendChild(confetti);

  const angle = Math.random() * Math.PI * 2;
  const velocity = 5 + Math.random() * 10;
  const gravity = 0.5;
  const drag = 0.98;
  const duration = 2000;

  let vx = Math.cos(angle) * velocity;
  let vy = Math.sin(angle) * velocity - 5;
  let posX = x;
  let posY = y;
  let rotation = Math.random() * 360;
  let rotationSpeed = (Math.random() - 0.5) * 20;

  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      confetti.remove();
      return;
    }

    vy += gravity;
    vx *= drag;
    vy *= drag;

    posX += vx;
    posY += vy;
    rotation += rotationSpeed;

    confetti.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    confetti.style.left = `${posX}px`;
    confetti.style.top = `${posY}px`;
    confetti.style.opacity = `${1 - progress}`;

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};
