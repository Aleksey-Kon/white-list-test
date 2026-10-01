import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setTheme } from '@/utils/themePreference';

export function useThemeToggle() {
  const theme = useColorScheme();
  const [rotation] = useState(() => new Animated.Value(0));
  const [isSwitching, setIsSwitching] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animation.current?.stop();
    };
  }, []);

  const toggleTheme = async () => {
    if (busy.current || !mounted.current) return;
    busy.current = true;
    setIsSwitching(true);
    const next = theme === 'dark' ? 'light' : 'dark';
    const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (!mounted.current) return;

    const finish = (finished: boolean) => {
      if (!mounted.current) return;
      if (finished) {
        void setTheme(next).catch((error) => console.warn('Could not save theme preference:', error));
      }
      rotation.setValue(0);
      animation.current = null;
      busy.current = false;
      setIsSwitching(false);
    };

    if (reducedMotion) {
      finish(true);
      return;
    }

    animation.current = Animated.timing(rotation, {
      toValue: 1,
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.current.start(({ finished }) => finish(finished));
  };

  return { rotation, isSwitching, toggleTheme };
}
