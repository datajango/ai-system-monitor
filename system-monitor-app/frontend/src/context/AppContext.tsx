// frontend/src/context/AppContext.tsx
import { createContext, useContext, useReducer } from "react";

// Define state types
type AppState = {
  darkMode: boolean;
  sidebarCollapsed: boolean;
};

// Define action types
type AppAction =
  | { type: "TOGGLE_DARK_MODE" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR_COLLAPSED"; payload: boolean };

// Create initial state
const initialState: AppState = {
  darkMode: localStorage.getItem("darkMode") === "true",
  sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "true",
};

// Create context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

// Create reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "TOGGLE_DARK_MODE":
      localStorage.setItem("darkMode", (!state.darkMode).toString());
      return { ...state, darkMode: !state.darkMode };
    case "TOGGLE_SIDEBAR":
      localStorage.setItem(
        "sidebarCollapsed",
        (!state.sidebarCollapsed).toString()
      );
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "SET_SIDEBAR_COLLAPSED":
      localStorage.setItem("sidebarCollapsed", action.payload.toString());
      return { ...state, sidebarCollapsed: action.payload };
    default:
      return state;
  }
}

// Create provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Create custom hook for using the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
