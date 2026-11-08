import { Token } from '@kuzulabz/expo-kagome';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  type ReactNode,
  useCallback,
} from 'react';
import {
  BottomSheetModalProvider,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { EntryBottomSheetModal } from '../components/entry-modal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type EntryModalContextType = {
  setToken: (t: Token) => void;
};

const EntryModalContext = createContext<EntryModalContextType>({
  setToken: () => {},
});

type EntryModalProviderProps = {
  children: ReactNode;
};

export function EntryModalProvider({ children }: EntryModalProviderProps) {
  const bottomSheetRef = useRef<BottomSheetModalType>(null);
  const [token, setTokenState] = useState<Token | null>(null);

  const setToken = useCallback((nextToken: Token) => {
    setTokenState(nextToken);
    bottomSheetRef.current?.present();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <EntryModalContext.Provider value={{ setToken }}>
          {children}
          <EntryBottomSheetModal ref={bottomSheetRef} token={token} />
        </EntryModalContext.Provider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export function useEntryModal() {
  const context = useContext(EntryModalContext);

  if (!context) {
    throw new Error('useEntryModalContext must be used inside a EntryModalProvider');
  }

  return context;
}
