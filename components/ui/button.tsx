import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, TextProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children?: React.ReactNode;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  iconSize?: number;
  className?: string;
  textClassName?: string;
  textProps?: TextProps;
}

const containerVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:opacity-90',
  secondary: 'bg-secondary active:opacity-90',
  outline: 'border border-border bg-transparent active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-destructive active:opacity-90',
};

const textVariants: Record<ButtonVariant, string> = {
  primary: 'text-primaryForeground',
  secondary: 'text-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
};

const sizeVariants: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3',
  md: 'h-11 rounded-xl px-4',
  lg: 'h-13 rounded-xl px-5',
  icon: 'h-11 w-11 rounded-xl',
};

const textSizeVariants: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  icon: 'text-sm',
};

export function Button({
  children,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  iconSize,
  className,
  textClassName,
  textProps,
  accessibilityLabel,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const resolvedIconSize = iconSize ?? (size === 'sm' ? 16 : size === 'lg' ? 20 : 18);

  const content = label ?? children;
  const iconColorClassName = textVariants[variant];

  const iconElement = icon ? (
    <Ionicons name={icon} size={resolvedIconSize} className={iconColorClassName} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        containerVariants[variant],
        sizeVariants[size],
        isDisabled && 'opacity-50',
        className
      )}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {iconPosition === 'left' && iconElement}

          {typeof content === 'string' ? (
            <Text
              {...textProps}
              className={cn(
                'font-semibold',
                textVariants[variant],
                textSizeVariants[size],
                textClassName,
                textProps?.className
              )}>
              {content}
            </Text>
          ) : (
            content
          )}

          {iconPosition === 'right' && iconElement}
        </View>
      )}
    </Pressable>
  );
}

export default Button;
