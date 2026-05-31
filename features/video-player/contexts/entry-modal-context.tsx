import { Token } from "@kuzulabz/expo-kagome";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  type ReactNode,
  useEffect,
  useCallback,
} from "react";
import {
  BottomSheetModalProvider,
  type BottomSheetModal as BottomSheetModalType,
} from "@gorhom/bottom-sheet";
import { EntryBottomSheetModal } from "../components/entry-modal";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type EntryModalContextType = {
  setToken: (t: Token) => void;
};

const EntryModalContext = createContext<EntryModalContextType>({
  setToken: () => { },
});

type EntryModalProviderProps = {
  children: ReactNode;
};

export function EntryModalProvider({ children }: EntryModalProviderProps) {
  const bottomSheetRef = useRef<BottomSheetModalType>(null);

  const [token, setTokenState] = useState<Token | null>(null);
  const [shouldPresent, setShouldPresent] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const setToken = useCallback((nextToken: Token) => {
    console.log("set token", nextToken.surface_form);

    setTokenState(nextToken);
    setShouldPresent(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (!shouldPresent) return;
    if (isDismissing) return;

    const frame = requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
      setShouldPresent(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [token, shouldPresent, isDismissing]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>

      <BottomSheetModalProvider>
        <EntryModalContext.Provider value={{ setToken }}>
          {children}
          <EntryBottomSheetModal
            ref={bottomSheetRef}
            token={token}
            onDismiss={() => {
              setIsDismissing(false);
            }}
            onAnimate={(fromIndex, toIndex) => {
              if (toIndex === -1) {
                setIsDismissing(true);
              }
            }}
          >
          </EntryBottomSheetModal>
        </EntryModalContext.Provider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export function useEntryModal() {
  const context = useContext(EntryModalContext);

  if (!context) {
    throw new Error(
      "useEntryModalContext must be used inside a EntryModalProvider"
    );
  }

  return context;
}
