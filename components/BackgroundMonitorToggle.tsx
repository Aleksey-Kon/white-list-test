import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}
        disabled={disabled} accessibilityRole="switch"
        accessibilityState={{ checked: isEnabled, disabled }} accessibilityLabel="Фоновый мониторинг">
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, isEnabled && styles.iconContainerActive]}>
            <IconSymbol
              name={isEnabled ? 'bell.fill' : 'bell'}
              size={20}
              color={isEnabled ? '#FFFFFF' : '#666'}
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="defaultSemiBold" style={styles.title}>Фоновый мониторинг</ThemedText>
            <ThemedText style={styles.description}>
              {isEnabled
                ? `Включён — интервал от ${intervalMinutes} мин.`
                : 'Выключен — нажмите для включения'}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.toggleSwitch, isEnabled && styles.toggleSwitchActive]}>
          <View style={[styles.toggleKnob, isEnabled && styles.toggleKnobActive]} />
        </View>
      </TouchableOpacity>

      <View style={[styles.intervalContainer, !intervalEnabled && styles.disabled]}>
        <View style={styles.intervalHeader}>
          <ThemedText style={styles.intervalLabel}>Интервал проверки</ThemedText>
          <ThemedText type="defaultSemiBold">{draftInterval} мин.</ThemedText>
        </View>
        <View
          style={styles.sliderTouchArea}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Минимальный интервал фоновой проверки"
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
          <View style={styles.sliderTrack} pointerEvents="none">
            <View style={[styles.sliderFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.sliderThumb, { left: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.rangeLabels}>
          <ThemedText style={styles.rangeText}>{MIN_INTERVAL} мин.</ThemedText>
          <ThemedText style={styles.rangeText}>30 мин.</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 24, marginVertical: 12, borderRadius: 12, padding: 12, backgroundColor: 'rgba(128, 128, 128, 0.1)' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconContainerActive: { backgroundColor: '#4CAF50' },
  textContainer: { flex: 1 },
  title: { fontSize: 16 },
  description: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  toggleSwitch: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#CCC', justifyContent: 'center', padding: 2 },
  toggleSwitchActive: { backgroundColor: '#4CAF50' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { alignSelf: 'flex-end' },
  intervalContainer: { marginTop: 16 },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  intervalLabel: { fontSize: 14 },
  sliderTouchArea: { height: 36, justifyContent: 'center' },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: '#CCC' },
  sliderFill: { height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  sliderThumb: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, marginLeft: -10, backgroundColor: '#4CAF50', elevation: 3 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontSize: 12, opacity: 0.6 },
  disabled: { opacity: 0.45 },
});
