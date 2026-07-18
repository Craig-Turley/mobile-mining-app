import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cn } from '@/utils/cn';

cssInterop(RNTextInput, {
  className: {
    target: 'style',
  },
  placeholderClassName: {
    target: false,
    nativeStyleToProp: {
      color: 'placeholderTextColor',
    },
  },
});

type Props = TextInputProps & {
  className?: string;
  placeholderClassName?: string;
};

export const TextInput = forwardRef<RNTextInput, Props>(
  ({ className = '', placeholderClassName = 'text-muted-foreground', ...props }, ref) => (
    <RNTextInput
      ref={ref}
      className={cn(
        'h-12 rounded-xl border border-border bg-background px-4 py-0 text-base leading-5 text-foreground',
        className
      )}
      placeholderClassName={placeholderClassName}
      textAlignVertical="center"
      multiline={false}
      style={{
        textAlignVertical: 'center', // NOTE: couldn't do this in native-wind
      }}
      {...props}
    />
  )
);

TextInput.displayName = 'TextInput';
