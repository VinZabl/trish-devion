import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

const FloatingSupportButton: React.FC = () => {
  const { siteSettings } = useSiteSettings();
  const supportLink = siteSettings?.footer_support_url;
  const [bottomPosition, setBottomPosition] = useState(24); // 6 * 4 = 24px (bottom-6)
  const lastScrollY = useRef(0);
  const isLocked = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      // Find the footer separator line by ID
      const separator = document.getElementById('footer-separator');
      if (!separator) return;

      const separatorRect = separator.getBoundingClientRect();
      const separatorTop = separatorRect.top;
      const viewportHeight = window.innerHeight;
      const buttonHeight = 56; // w-14 h-14 = 56px
      const defaultBottom = 24; // bottom-6 = 24px
      const minSpacing = 16; // Minimum spacing above separator

      // Calculate distance from separator top to viewport bottom
      const separatorDistanceFromBottom = viewportHeight - separatorTop;
      
      // Calculate the button's bottom position if it were at default position
      const buttonBottomAtDefault = viewportHeight - defaultBottom;
      
      // Check if button would overlap or go below separator
      if (buttonBottomAtDefault >= separatorTop - minSpacing) {
        // Button would be at or below separator, lock it above
        const lockedBottom = separatorDistanceFromBottom + minSpacing;
        setBottomPosition(Math.max(lockedBottom, minSpacing));
        isLocked.current = true;
      } else {
        // Button is above separator, use normal position
        setBottomPosition(defaultBottom);
        isLocked.current = false;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!supportLink) return null;

  return (
    <a
      href={supportLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cafe-primary to-cafe-secondary text-white flex items-center justify-center shadow-lg hover:from-cafe-secondary hover:to-cafe-primary transition-all duration-200 transform hover:scale-110 z-40 glow-blue hover:glow-blue-strong"
      style={{ bottom: `${bottomPosition}px` }}
      aria-label="Customer Support"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </a>
  );
};

export default FloatingSupportButton;
