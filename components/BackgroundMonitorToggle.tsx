import { useLocalization } from '@/hooks/useLocalization';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES } from '@/utils/backgroundMonitorPolicy';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface BackgroundMonitorToggleProps {
  isEnabled: boolean;
  intervalMinutes: number;
  onIntervalChange: (minutes: number) => void;
  onToggle: () => void;
  disabled: boolean;
  isTestEnabled: boolean;
}

const MIN_INTERVAL = MIN_INTERVAL_MINUTES;
const MAX_INTERVAL = MAX_INTERVAL_MINUTES;

export function BackgroundMonitorToggle({
  isEnabled,
  intervalMinutes,
  onIntervalChange,
  onToggle,
  disabled,
  isTestEnabled,
}: BackgroundMonitorToggleProps) {
  const { t } = useLocalization();
  const isDark = useColorScheme() === 'dark';
  const [sliderWidth, setSliderWidth] = useState(1);
  const [draftInterval, setDraftInterval] = useState(intervalMinutes);
  const draft = useRef(intervalMinutes);
  const intervalEnabled = (isEnabled || isTestEnabled) && !disabled;
  const progress = (draftInterval - MIN_INTERVAL) / (MAX_INTERVAL - MIN_INTERVAL);

  useEffect(() => {
    draft.current = intervalMinutes;
    setDraftInterval(intervalMinutes);
  }, [intervalMinutes, disabled]);

  const updateInterval = (locationX: number) => {
    const ratio = Math.min(1, Math.max(0, locationX / sliderWidth));
    draft.current = MIN_INTERVAL + Math.round(ratio * (MAX_INTERVAL - MIN_INTERVAL));
    setDraftInterval(draft.current);
  };

  const commitInterval = () => {
    if (intervalEnabled && draft.current !== intervalMinutes) onIntervalChange(draft.current);
  };

  return (
    <ThemedView style={[styles.container, isDark && darkStyles.container]}>
      <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}
        disabled={disabled} accessibilityRole="switch"
        accessibilityState={{ checked: isEnabled, disabled }} accessibilityLabel={t('backgroundMonitoring')}>
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, isEnabled && styles.iconContainerActive,
            isDark && (isEnabled ? darkStyles.activeControl : darkStyles.iconContainer)]}>
            <IconSymbol
              name={isEnabled ? 'bell.fill' : 'bell'}
              size={20}
              color={isEnabled ? '#FFFFFF' : isDark ? Colors.dark.icon : '#666'}
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="defaultSemiBold" style={styles.title}>{t('backgroundMonitoring')}</ThemedText>
            <ThemedText style={styles.description}>
              {isEnabled
                ? t('monitorEnabled', { minutes: intervalMinutes })
                : t('monitorDisabled')}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.toggleSwitch, isEnabled && styles.toggleSwitchActive,
          isDark && (isEnabled ? darkStyles.activeControl : darkStyles.inactiveControl)]}>
          <View style={[styles.toggleKnob, isEnabled && styles.toggleKnobActive]} />
        </View>
      </TouchableOpacity>

      <View style={[styles.intervalContainer, !intervalEnabled && styles.disabled]}>
        <View style={styles.intervalHeader}>
          <ThemedText style={styles.intervalLabel}>{t('checkInterval')}</ThemedText>
          <ThemedText type="defaultSemiBold">{t('minutes', { count: draftInterval })}</ThemedText>
        </View>
        <View
          style={[styles.sliderTouchArea, !intervalEnabled && styles.hiddenSlider]}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('minimumInterval')}
          accessibilityState={{ disabled: !intervalEnabled }}
          accessibilityValue={{ min: MIN_INTERVAL, max: MAX_INTERVAL, now: draftInterval }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (intervalEnabled) onIntervalChange(Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL,
              intervalMinutes + (event.nativeEvent.actionName === 'increment' ? 1 : -1))));
          }}
          onStartShouldSetResponder={() => intervalEnabled}
          onMoveShouldSetResponder={() => intervalEnabled}
          onResponderGrant={(event) => updateInterval(event.nativeEvent.locationX)}
          onResponderMove={(event) => updateInterval(event.nativeEvent.locationX)}
          onResponderRelease={commitInterval}
          onResponderTerminate={commitInterval}
          onResponderTerminationRequest={() => false}
        >
          <View style={[styles.sliderTrack, isDark && darkStyles.inactiveControl]} pointerEvents="none">
            <View style={[styles.sliderFill, isDark && darkStyles.sliderAccent, { width: `${progress * 100}%` }]} />
            <View style={[styles.sliderThumb, isDark && darkStyles.sliderAccent, { left: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={[styles.rangeLabels, !intervalEnabled && styles.hiddenSlider]}>
          <ThemedText style={styles.rangeText}>{t('minutes', { count: MIN_INTERVAL })}</ThemedText>
          <ThemedText style={styles.rangeText}>{t('minutes', { count: MAX_INTERVAL })}</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 24, marginVertical: 12, borderRadius: 18, padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EAF2', shadowColor: '#102A43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconContainerActive: { backgroundColor: '#4CAF50' },
  textContainer: { flex: 1 },
  title: { fontSize: 16 },
  description: { fontSize: 13, opacity: 0.68, marginTop: 3 },
  toggleSwitch: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#CCC', justifyContent: 'center', padding: 2 },
  toggleSwitchActive: { backgroundColor: '#4CAF50' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { alignSelf: 'flex-end' },
  intervalContainer: { marginTop: 18 },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  intervalLabel: { fontSize: 14 },
  sliderTouchArea: { height: 36, justifyContent: 'center' },
  hiddenSlider: { height: 0, opacity: 0 },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: '#D9E1EC' },
  sliderFill: { height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  sliderThumb: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, marginLeft: -10, backgroundColor: '#4CAF50', elevation: 3 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontSize: 12, opacity: 0.6 },
  disabled: { opacity: 0.6 },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: Colors.dark.surface, borderColor: Colors.dark.border },
  iconContainer: { backgroundColor: Colors.dark.surfaceRaised },
  activeControl: { backgroundColor: Colors.dark.controlActive },
  inactiveControl: { backgroundColor: Colors.dark.controlTrack },
  sliderAccent: { backgroundColor: Colors.dark.success },
});
