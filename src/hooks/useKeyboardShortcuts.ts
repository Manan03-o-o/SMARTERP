import { useEffect } from 'react';

export interface KeyBinding {
  key: string; // e.g., 'f1', 'f4', 'alt+l', 'ctrl+q', 'escape'
  action: (e: KeyboardEvent) => void;
  description: string;
  category: 'Global' | 'Masters' | 'Vouchers' | 'Inventory' | 'Reports' | 'Navigation';
}

export const useKeyboardShortcuts = (bindings: KeyBinding[], active: boolean = true) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Determine modifiers
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      
      const keyName = e.key.toLowerCase();
      // Only append key if it's not a standalone modifier key
      if (keyName !== 'control' && keyName !== 'alt' && keyName !== 'shift') {
        parts.push(keyName);
      }

      const shortcutCombo = parts.join('+');

      // Check for match (either full combo or just the standalone key, e.g. "escape" or "f1")
      const match = bindings.find(
        (b) => b.key.toLowerCase() === shortcutCombo || b.key.toLowerCase() === keyName
      );

      if (match) {
        // Prevent default actions for interceptable keys like F1, F3, F4, etc.
        const shouldPreventDefault = [
          'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10',
          'escape', 'alt+l', 'alt+a', 'alt+g', 'alt+s', 'alt+u',
          'ctrl+q', 'ctrl+h', 'ctrl+k', 'ctrl+b', 'ctrl+p', 'ctrl+i', 'ctrl+n'
        ].includes(shortcutCombo) || ['f1', 'f3', 'f4', 'f8', 'f9'].includes(keyName);

        if (shouldPreventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        match.action(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bindings, active]);
};
export default useKeyboardShortcuts;
