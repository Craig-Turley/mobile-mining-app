import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  BottomSheetModalProvider,
  type BottomSheetModal,
} from "@gorhom/bottom-sheet";

import { NewDeckBottomSheetModal } from "../components/new-deck-modal";

type NewDeckModalContextValue = {
  open: () => void;
  close: () => void;
};

const NewDeckModalContext =
  createContext<NewDeckModalContextValue | undefined>(undefined);

type NewDeckModalProviderProps = {
  children: ReactNode;
};

export function NewDeckModalProvider({
  children,
}: NewDeckModalProviderProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const open = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const close = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const contextValue = useMemo(
    () => ({
      open,
      close,
    }),
    [open, close],
  );

  return (
    <BottomSheetModalProvider>
      <NewDeckModalContext.Provider value={contextValue}>
        {children}
        <NewDeckBottomSheetModal ref={bottomSheetRef} />
      </NewDeckModalContext.Provider>
    </BottomSheetModalProvider>
  );
}

export function useNewDeckModal() {
  const context = useContext(NewDeckModalContext);

  if (!context) {
    throw new Error(
      "useNewDeckModal must be used inside NewDeckModalProvider",
    );
  }

  return context;
}
