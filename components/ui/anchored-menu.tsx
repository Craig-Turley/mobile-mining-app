import React, { isValidElement, useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View, type Insets } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type MenuPosition = {
  top: number;
  right: number;
};

type AnchoredMenuProps = {
  children: React.ReactNode;
  disabled?: boolean;
  menuWidth?: number;
  accessibilityLabel?: string;
  enableHaptics?: boolean;
};

type AnchoredMenuTriggerProps = {
  children: React.ReactNode;
  className?: string;
  hitSlop?: number | Insets;
  accessibilityLabel?: string;
};

type AnchoredMenuItemProps = {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const DEFAULT_MENU_WIDTH = 190;
const MENU_ITEM_HEIGHT = 52;
const SCREEN_PADDING = 12;
const MENU_GAP = 4;

export function AnchoredMenu({
  children,
  disabled = false,
  menuWidth = DEFAULT_MENU_WIDTH,
  accessibilityLabel = 'Open menu',
  enableHaptics = true,
}: AnchoredMenuProps) {
  const triggerRef = useRef<View>(null);

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    right: SCREEN_PADDING,
  });

  const childElements = useMemo(() => React.Children.toArray(children), [children]);

  const trigger = childElements.find(
    (child) => isValidElement(child) && child.type === AnchoredMenuTrigger
  ) as React.ReactElement<AnchoredMenuTriggerProps> | undefined;

  const items = childElements.filter(
    (child) => isValidElement(child) && child.type === AnchoredMenuItem
  ) as React.ReactElement<AnchoredMenuItemProps>[];

  const closeMenu = useCallback(() => {
    setVisible(false);
  }, []);

  const playOpenHaptic = useCallback(() => {
    if (!enableHaptics) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
      if (__DEV__) {
        console.warn('Menu haptic feedback is unavailable:', error);
      }
    });
  }, [enableHaptics]);

  const openMenu = useCallback(() => {
    if (disabled || visible) {
      return;
    }

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get('window');
      const menuHeight = items.length * MENU_ITEM_HEIGHT;
      const desiredTop = y + height + MENU_GAP;

      const shouldOpenAbove = desiredTop + menuHeight > screen.height - SCREEN_PADDING;

      const top = shouldOpenAbove
        ? Math.max(SCREEN_PADDING, y - menuHeight - MENU_GAP)
        : desiredTop;

      const desiredRight = screen.width - (x + width);

      const right = Math.max(
        SCREEN_PADDING,
        Math.min(desiredRight, screen.width - menuWidth - SCREEN_PADDING)
      );

      setPosition({ top, right });
      setVisible(true);
      playOpenHaptic();
    });
  }, [disabled, items.length, menuWidth, playOpenHaptic, visible]);

  const runAction = useCallback(
    (action: () => void) => {
      closeMenu();

      requestAnimationFrame(() => {
        action();
      });
    },
    [closeMenu]
  );

  if (!trigger) {
    if (__DEV__) {
      console.warn('AnchoredMenu requires an AnchoredMenuTrigger child.');
    }

    return null;
  }

  const triggerProps = trigger.props;

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triggerProps.accessibilityLabel ?? accessibilityLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={triggerProps.hitSlop ?? 12}
          onPress={openMenu}
          className={[
            'items-center justify-center rounded-full',
            'active:bg-muted/50',
            disabled ? 'opacity-40' : '',
            triggerProps.className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}>
          {triggerProps.children}
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={closeMenu}
            style={StyleSheet.absoluteFill}
            className="bg-black/10"
          />

          <View
            accessibilityRole="menu"
            className="absolute overflow-hidden rounded-xl bg-background"
            style={[
              styles.menu,
              {
                top: position.top,
                right: position.right,
                width: menuWidth,
              },
            ]}>
            {items.map((item, index) => {
              const {
                label,
                icon,
                destructive = false,
                disabled: itemDisabled = false,
                onPress,
              } = item.props;

              return (
                <React.Fragment key={`${label}-${index}`}>
                  {index > 0 ? <View className="mx-3 h-px bg-border" /> : null}

                  <Pressable
                    accessibilityRole="menuitem"
                    accessibilityLabel={label}
                    accessibilityState={{
                      disabled: itemDisabled,
                    }}
                    disabled={itemDisabled}
                    onPress={() => runAction(onPress)}
                    className={[
                      'min-h-[52px] flex-row items-center gap-3 px-4',
                      'active:bg-muted/50',
                      itemDisabled ? 'opacity-40' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}>
                    {icon ? (
                      <Ionicons
                        name={icon}
                        size={18}
                        className={destructive ? 'text-destructive' : 'text-foreground'}
                      />
                    ) : null}

                    <Text
                      className={[
                        'flex-1 text-[15px] font-medium',
                        destructive ? 'text-destructive' : 'text-foreground',
                      ].join(' ')}>
                      {label}
                    </Text>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Marker component consumed by AnchoredMenu.
 * It is not rendered independently.
 */
export function AnchoredMenuTrigger(_props: AnchoredMenuTriggerProps) {
  return null;
}

/**
 * Marker component consumed by AnchoredMenu.
 * It is not rendered independently.
 */
export function AnchoredMenuItem(_props: AnchoredMenuItemProps) {
  return null;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  menu: {
    position: 'absolute',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 8,
  },
});
