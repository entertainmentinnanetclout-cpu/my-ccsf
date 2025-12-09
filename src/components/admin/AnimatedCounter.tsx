import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

export const AnimatedCounter = ({ to }: { to: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, to, {
      duration: 1.5,
      onUpdate(value) {
        node.textContent = Math.round(value).toString();
      },
    });
    return () => controls.stop();
  }, [to]);

  return <span ref={nodeRef} />;
};
