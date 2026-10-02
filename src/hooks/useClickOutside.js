import { useEffect } from 'react';

export function useClickOutside(ref, isOpen, onClose, extraIgnore) {
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        if (extraIgnore && e.target.closest(extraIgnore)) return;
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, ref, extraIgnore]);
}
