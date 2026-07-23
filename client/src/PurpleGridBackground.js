import React, { useEffect, useRef } from 'react';

const PurpleGridBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse trail coordinates
    let trail = [];
    // const maxTrailLength = 35;

    let mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      if (!mouse.active) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('resize', handleResize);

    const gridSize = 45; // grid cell size in px

    const render = () => {
      // Smooth lerp mouse movement
      mouse.x += (mouse.targetX - mouse.x) * 0.3;
      mouse.y += (mouse.targetY - mouse.y) * 0.3;

      // if (mouse.active) {
      //   trail.push({
      //     x: mouse.x,
      //     y: mouse.y,
      //     age: 0,
      //     maxAge: 30
      //   });
      // }

      // if (trail.length > maxTrailLength) {
      //   trail.shift();
      // }

      // Update ages
      // for (let i = 0; i < trail.length; i++) {
      //   trail[i].age++;
      // }
      // trail = trail.filter((t) => t.age < t.maxAge);

      // Deep dark purple background
      ctx.fillStyle = '#080512';
      ctx.fillRect(0, 0, width, height);

      // 1. Base Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.12)';

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Highlight grid cells around mouse trail
      if (trail.length > 0) {
        for (let i = 0; i < trail.length; i++) {
          const pt = trail[i];
          const progress = 1 - pt.age / pt.maxAge; // 1 -> 0
          const radius = 130 * progress;

          const startCol = Math.floor((pt.x - radius) / gridSize) * gridSize;
          const endCol = Math.ceil((pt.x + radius) / gridSize) * gridSize;
          const startRow = Math.floor((pt.y - radius) / gridSize) * gridSize;
          const endRow = Math.ceil((pt.y + radius) / gridSize) * gridSize;

          for (let gx = startCol; gx <= endCol; gx += gridSize) {
            for (let gy = startRow; gy <= endRow; gy += gridSize) {
              const dx = gx + gridSize / 2 - pt.x;
              const dy = gy + gridSize / 2 - pt.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < radius) {
                const intensity = (1 - dist / radius) * progress;
                const fillAlpha = intensity * 0.35;
                const borderAlpha = intensity * 0.7;

                // Glowing cell background
                ctx.fillStyle = `rgba(168, 85, 247, ${fillAlpha})`;
                ctx.fillRect(gx, gy, gridSize, gridSize);

                // Cell neon grid borders
                ctx.strokeStyle = `rgba(216, 180, 254, ${borderAlpha})`;
                ctx.lineWidth = 1.2;
                ctx.strokeRect(gx, gy, gridSize, gridSize);
              }
            }
          }
        }

        // 3. Smooth Glowing Purple Line Trail
        // ctx.beginPath();
        // for (let i = 0; i < trail.length; i++) {
        //   const pt = trail[i];
        //   if (i === 0) {
        //     ctx.moveTo(pt.x, pt.y);
        //   } else {
        //     const prev = trail[i - 1];
        //     const xc = (pt.x + prev.x) / 2;
        //     const yc = (pt.y + prev.y) / 2;
        //     ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
        //   }
        // }

        // ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        // ctx.lineWidth = 3.5;
        // ctx.shadowColor = '#a855f7';
        // ctx.shadowBlur = 12;
        // ctx.stroke();
        // ctx.shadowBlur = 0;

        // 4. Glowing Head & Trail Particle Aura
        for (let i = 0; i < trail.length; i++) {
          const pt = trail[i];
          const progress = 1 - pt.age / pt.maxAge;
          const r = (i / trail.length) * 12 * progress + 2;

          const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3.5);
          gradient.addColorStop(0, `rgba(244, 114, 182, ${progress})`);
          gradient.addColorStop(0.4, `rgba(168, 85, 247, ${progress * 0.7})`);
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

          ctx.fillStyle = gradient;
          // ctx.beginPath();
          ctx.arc(pt.x, pt.y, r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Grid intersection glowing dots
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      for (let x = 0; x <= width; x += gridSize) {
        for (let y = 0; y <= height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default PurpleGridBackground;
