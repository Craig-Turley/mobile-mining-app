import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(index)" >
        <NativeTabs.Trigger.Label>Watch</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="play.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
