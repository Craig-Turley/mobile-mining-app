import React, { ComponentProps } from 'react';
import { View, Text, ViewProps, Pressable } from 'react-native';
import { AnkiSettingsToolbar } from './components/anki-settings-toolbar';
import { cn } from '@/utils/cn';
import { TextProps } from 'react-native/Libraries/Text/Text';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';

interface ModelsScreenProps {}

type RoutePathname = Extract<Href, { pathname: unknown }>['pathname'];
type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Row = {
  label: string;
  description: string;
  pathname: RoutePathname;
  icon: IoniconName;
  badge?: string;
};

type Group = {
  title: string;
  rows: Row[];
};

const GROUPS: Group[] = [
  {
    title: 'Structure',
    rows: [
      {
        label: 'Models',
        description: 'Models used to generate cards',
        pathname: '/models-screen',
        icon: 'layers',
      },
      {
        label: 'Decks',
        description: 'Where new mines land',
        pathname: '/decks-screen',
        icon: 'file-tray',
      },
    ],
  },
];

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
    },
  },
});

export const AnkiSettingsScreen: React.FC<ModelsScreenProps> = () => {
  return (
    <View className="flex-1 bg-background">
      <AnkiSettingsToolbar />
      <View className="w-full flex-1 space-y-3 p-3">
        {GROUPS.map((group) => (
          <Section key={group.title}>
            <SectionTitle>{group.title}</SectionTitle>

            <SectionBody>
              {group.rows.map((row, rowIndex) => {
                const isLast = rowIndex === group.rows.length - 1;

                return (
                  <SectionTab
                    key={`${group.title}-${row.label}`}
                    onPress={() => {
                      router.push({
                        pathname: row.pathname,
                      });
                    }}
                    className={cn('flex-row items-center gap-3', isLast && 'border-b-0')}>
                    <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                      <Ionicons name={row.icon} size={18} className="text-primary" />
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {row.label}
                      </Text>

                      <Text className="text-sm text-mutedForeground" numberOfLines={1}>
                        {row.description}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      className="shrink-0 text-mutedForeground"
                    />
                  </SectionTab>
                );
              })}
            </SectionBody>
          </Section>
        ))}
      </View>
    </View>
  );
};

interface SectionProps extends ViewProps {}

const Section = ({ className, children, ...rest }: SectionProps) => {
  return (
    <View className={cn('w-full flex-1', className)} {...rest}>
      {children}
    </View>
  );
};

interface SectionTitleProps extends TextProps {}

const SectionTitle = ({ className, children, ...rest }: SectionTitleProps) => {
  return (
    <Text className={cn('py-3 text-lg text-mutedForeground', className)} {...rest}>
      {children}
    </Text>
  );
};

interface SectionBodyProps extends ViewProps {}

const SectionBody = ({ className, children, ...rest }: SectionBodyProps) => {
  return (
    <View
      className={cn(
        'w-full overflow-hidden rounded-2xl',
        'border border-border bg-surface',
        className
      )}
      {...rest}>
      {children}
    </View>
  );
};

interface SectionTabProps extends ViewProps {
  onPress: () => void;
}

const SectionTab = ({ className, onPress, children, ...rest }: SectionTabProps) => {
  return (
    <Pressable onPress={onPress}>
      <View
        className={cn(
          'w-full overflow-hidden rounded-2xl p-3',
          'border-b border-border bg-surface',
          className
        )}
        {...rest}>
        {children}
      </View>
    </Pressable>
  );
};
