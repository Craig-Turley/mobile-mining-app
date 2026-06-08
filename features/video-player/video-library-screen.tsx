import { useAppTheme } from '@/theme/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { PropsWithChildren } from 'react';
import { ScrollView, View, Text, Pressable, Button } from 'react-native';

interface ScreenContentProps extends PropsWithChildren {
}

// <Stack.Toolbar placement="right">
//   <Stack.Toolbar.Button
//     icon="plus"
//     onPress={() => {
//       Alert.alert("Add");
//     }}
//   />
// </Stack.Toolbar>
export const VideoLibraryScreen: React.FC<ScreenContentProps> = ({ children }) => {
  const { colors } = useAppTheme();

  return (

    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "ライブラリ",
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerSearchBarOptions: {
            placeholder: "Search...",
            hideWhenScrolling: false,
          },
        }}
      />


      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
      >
        {Array.from({ length: 5 }, (_, index) => index).map((v) => (
          <View className="p-4" key={v}>
            <Text className="text-2xl text-sky-200">
              {v.toString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
