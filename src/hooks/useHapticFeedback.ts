// Haptic feedback utility for mobile devices
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
  // Check if the Vibration API is available
  if (!navigator.vibrate) return;

  // Different vibration patterns for different feedback types
  const patterns = {
    light: 10,      // Very short tap
    medium: 25,     // Standard tap
    heavy: 50,      // Strong feedback
    selection: [10, 30, 10], // Double tap for selection
  };

  try {
    navigator.vibrate(patterns[type]);
  } catch (e) {
    // Fail silently if vibration is not supported
  }
};

// Hook for button haptic feedback
export const useHapticFeedback = () => {
  const onPress = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    triggerHaptic(type);
  };

  return { onPress, triggerHaptic };
};
