import { cn } from '@/utils/cn';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, PressableProps, View, ViewProps, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CarouselContextValue<T> {
  currentPage: number;
  totalPages: number;
  data: T[];
  render: (item: T, index: number) => React.ReactNode;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const CarouselContext = createContext<CarouselContextValue<unknown> | null>(null);

function useCarousel<T = unknown>() {
  const context = useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used inside a CarouselContainer');
  }

  return context as CarouselContextValue<T>;
}

interface CarouselContainerProps<T> extends ViewProps {
  data: T[];
  render: (item: T, index: number) => React.ReactNode;
  initialPage?: number;
  children?: React.ReactNode;
}

export function CarouselContainer<T>({
  data,
  render,
  className,
  initialPage = 0,
  children,
  ...rest
}: CarouselContainerProps<T>) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = data.length;

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(() => {
        if (totalPages === 0) return 0;
        if (page < 0) return 0;
        if (page >= totalPages) return totalPages - 1;
        return page;
      });
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setCurrentPage((page) => {
      if (page >= totalPages - 1) return page;
      return page + 1;
    });
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage((page) => {
      if (page <= 0) return page;
      return page - 1;
    });
  }, []);

  const value = useMemo<CarouselContextValue<T>>(
    () => ({
      currentPage,
      totalPages,
      data,
      render,
      goToPage,
      nextPage,
      previousPage,
      canGoNext: currentPage < totalPages - 1,
      canGoPrevious: currentPage > 0,
    }),
    [currentPage, totalPages, data, render, goToPage, nextPage, previousPage]
  );

  return (
    <CarouselContext.Provider value={value as CarouselContextValue<unknown>}>
      <View className={cn('w-full', className)} {...rest}>
        {children ?? <CarouselContent />}
      </View>
    </CarouselContext.Provider>
  );
}

export interface CarouselToggleProps extends PressableProps {}

export function CarouselPrevious({ className, ...rest }: CarouselToggleProps) {
  const { previousPage, canGoPrevious } = useCarousel();

  return (
    <Pressable
      className={cn('justify-center', className)}
      onPress={previousPage}
      disabled={!canGoPrevious}
      {...rest}>
      <Ionicons className="color-primary" name="chevron-back" size={24} />
    </Pressable>
  );
}

export function CarouselNext({ className, ...rest }: CarouselToggleProps) {
  const { nextPage, canGoNext } = useCarousel();

  return (
    <Pressable
      className={cn('justify-center', className)}
      onPress={nextPage}
      disabled={!canGoNext}
      {...rest}>
      <Ionicons className="color-primary" name="chevron-forward" size={24} />
    </Pressable>
  );
}

export interface CarouselContentProps extends ViewProps {}

export function CarouselContent({ className, ...rest }: CarouselContentProps) {
  const { currentPage, data, render } = useCarousel();
  const currentItem = data[currentPage];

  return (
    <View className={cn('w-full', className)} {...rest}>
      {currentItem !== undefined ? (
        render(currentItem, currentPage)
      ) : (
        <View>
          <Text className="text-foreground">Null on carasoul</Text>
        </View>
      )}
    </View>
  );
}

export interface CarouselHeaderProps extends ViewProps {
  label?: string;
  renderText?: (currentPage: number, totalPages: number) => string;
}

export function CarouselHeader({
  className,
  label = 'Entry',
  renderText,
  ...rest
}: CarouselHeaderProps) {
  const { currentPage, totalPages } = useCarousel();

  if (totalPages <= 1) {
    return null;
  }

  const text = renderText
    ? renderText(currentPage, totalPages)
    : `${label} ${currentPage + 1} / ${totalPages}`;

  return (
    <View className={cn('justify-center', className)} {...rest}>
      <Text className="text-accent">{text}</Text>
    </View>
  );
}
