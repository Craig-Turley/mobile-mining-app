import React, { useMemo } from 'react';
import { DynamicColorIOS, Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAppTheme } from '@/theme/theme-provider';
import { darkColors, lightColors } from '@/theme/colors';

export default function AppTabs() {
  const { colors } = useAppTheme();
  const appearance = useMemo(() => {
    // Liquid Glass can adapt its local contrast; dynamic native colors follow those traits.
    const normal =
      Platform.OS === 'ios'
        ? DynamicColorIOS({ light: lightColors.mutedForeground, dark: darkColors.mutedForeground })
        : colors.mutedForeground;
    const selected =
      Platform.OS === 'ios'
        ? DynamicColorIOS({ light: lightColors.primary, dark: darkColors.primary })
        : colors.primary;
    return {
      iconColor: { default: normal, selected },
      labelStyle: { default: { color: normal }, selected: { color: selected } },
      tintColor: selected,
      contentStyle: { backgroundColor: colors.background },
    };
  }, [colors]);

  return (
    <NativeTabs
      iconColor={appearance.iconColor}
      labelStyle={appearance.labelStyle}
      tintColor={appearance.tintColor}>
      <NativeTabs.Trigger name="(index)" contentStyle={appearance.contentStyle}>
        <NativeTabs.Trigger.Label>Watch</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="play.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(queue)" contentStyle={appearance.contentStyle}>
        <NativeTabs.Trigger.Label>Queue</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.full" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(configurations)" contentStyle={appearance.contentStyle}>
        <NativeTabs.Trigger.Label>Configurations</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
