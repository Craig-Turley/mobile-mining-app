import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  Text,
  TextProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'onPress'> {
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
  onPress?: (event: GestureResponderEvent) => void | Promise<void>;
  successLabel?: string;
  successIcon?: keyof typeof Ionicons.glyphMap | null;
  successDuration?: number;
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

const roundedVariants: Record<ButtonSize, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  icon: 'rounded-xl',
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
  onPress,
  successLabel,
  successIcon = 'checkmark',
  successDuration = 1000,
  ...pressableProps
}: ButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.9)).current;

  const runSuccessAnimation = () => {
    setShowSuccess(true);
    successOpacity.setValue(0);
    successScale.setValue(0.9);

    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(successScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        ]).start(() => setShowSuccess(false));
      }, successDuration);
    });
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (!onPress) return;
    const result = onPress(event);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => {
        if (successLabel) runSuccessAnimation();
      }).catch(() => {
        console.log("Button caught an error");
      });
    }
  };

  const isDisabled = disabled || loading || showSuccess;
  const resolvedIconSize = iconSize ?? (size === 'sm' ? 16 : size === 'lg' ? 20 : 18);
  const content = label ?? children;
  const iconElement = icon ? (
    <Ionicons name={icon} size={resolvedIconSize} className={textVariants[variant]} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      className={cn(
        'flex-row items-center justify-center gap-2 overflow-hidden',
        containerVariants[variant],
        sizeVariants[size],
        isDisabled && 'opacity-50',
        className
      )}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Animated.View className="flex-row items-center justify-center gap-2">
          {iconPosition === 'left' && iconElement}
          {typeof content === 'string' ? (
            <Text
              {...textProps}
              className={cn('font-semibold', textVariants[variant], textSizeVariants[size], textClassName, textProps?.className)}>
              {content}
            </Text>
          ) : (
            content
          )}
          {iconPosition === 'right' && iconElement}
        </Animated.View>
      )}

      {showSuccess && (
        <Animated.View
          pointerEvents="none"
          className={cn('absolute inset-0 flex-row items-center justify-center gap-2', roundedVariants[size], className, 'bg-green-500')}
          style={{ opacity: successOpacity, transform: [{ scale: successScale }] }}>
          {successIcon && <Ionicons name={successIcon} size={resolvedIconSize} color="white" />}
          <Text className={cn('font-semibold text-white', textSizeVariants[size])}>{successLabel}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export default Button;
