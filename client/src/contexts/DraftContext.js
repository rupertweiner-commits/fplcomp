import React, { createContext, useContext, useReducer, useCallback } from 'react';

const DraftContext = createContext();

// Action types
export const DRAFT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_DRAFT_STATUS: 'SET_DRAFT_STATUS',
  SET_SIMULATION_STATUS: 'SET_SIMULATION_STATUS',
  SET_CHELSEA_PLAYERS: 'SET_CHELSEA_PLAYERS',
  SET_DRAFT_PICKS: 'SET_DRAFT_PICKS',
  SET_LEADERBOARD: 'SET_LEADERBOARD',
  SET_LIVE_SCORES: 'SET_LIVE_SCORES',
  SET_ERROR: 'SET_ERROR',
  ADD_DRAFT_PICK: 'ADD_DRAFT_PICK',
  UPDATE_DRAFT_PICK: 'UPDATE_DRAFT_PICK',
  REMOVE_DRAFT_PICK: 'REMOVE_DRAFT_PICK',
  RESET_STATE: 'RESET_STATE'
};

// Initial state
const initialState = {
  draft: {
    status: null,
    loading: true,
    error: null
  },
  simulation: {
    status: null,
    loading: false,
    error: null
  },
  players: {
    chelsea: [],
    loading: false,
    error: null
  },
  picks: {
    data: [],
    loading: false,
    error: null
  },
  leaderboard: {
    data: [],
    loading: false,
    error: null
  },
  liveScores: {
    data: null,
    loading: false,
    error: null
  }
};

// Reducer
const draftReducer = (state, action) => {
  switch (action.type) {
    case DRAFT_ACTIONS.SET_LOADING:
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          loading: action.payload
        }
      };

    case DRAFT_ACTIONS.SET_DRAFT_STATUS:
      return {
        ...state,
        draft: {
          ...state.draft,
          status: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_SIMULATION_STATUS:
      return {
        ...state,
        simulation: {
          ...state.simulation,
          status: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_CHELSEA_PLAYERS:
      return {
        ...state,
        players: {
          ...state.players,
          chelsea: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_DRAFT_PICKS:
      return {
        ...state,
        picks: {
          ...state.picks,
          data: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_LEADERBOARD:
      return {
        ...state,
        leaderboard: {
          ...state.leaderboard,
          data: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_LIVE_SCORES:
      return {
        ...state,
        liveScores: {
          ...state.liveScores,
          data: action.payload,
          loading: false,
          error: null
        }
      };

    case DRAFT_ACTIONS.SET_ERROR:
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          error: action.payload,
          loading: false
        }
      };

    case DRAFT_ACTIONS.ADD_DRAFT_PICK:
      return {
        ...state,
        picks: {
          ...state.picks,
          data: [...state.picks.data, action.payload]
        }
      };

    case DRAFT_ACTIONS.UPDATE_DRAFT_PICK:
      return {
        ...state,
        picks: {
          ...state.picks,
          data: state.picks.data.map(pick =>
            pick.id === action.payload.id ? { ...pick, ...action.payload } : pick
          )
        }
      };

    case DRAFT_ACTIONS.REMOVE_DRAFT_PICK:
      return {
        ...state,
        picks: {
          ...state.picks,
          data: state.picks.data.filter(pick => pick.id !== action.payload)
        }
      };

    case DRAFT_ACTIONS.RESET_STATE:
      return initialState;

    default:
      return state;
  }
};

// Provider component
export const DraftProvider = ({ children, currentUser }) => {
  const [state, dispatch] = useReducer(draftReducer, initialState);

  // Use the existing hook for API calls
  const {
    fetchDraftData,
    fetchLiveScores,
    fetchLeaderboard,
    startSimulation,
    simulateGameweek,
    draftPlayer
  } = useDraftState(currentUser);

  // Action creators
  const actions = {
    // Draft actions
    setDraftLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'draft', payload: loading });
    }, []),

    setDraftStatus: useCallback((status) => {
      dispatch({ type: DRAFT_ACTIONS.SET_DRAFT_STATUS, payload: status });
    }, []),

    setDraftError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'draft', payload: error });
    }, []),

    // Simulation actions
    setSimulationLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'simulation', payload: loading });
    }, []),

    setSimulationStatus: useCallback((status) => {
      dispatch({ type: DRAFT_ACTIONS.SET_SIMULATION_STATUS, payload: status });
    }, []),

    setSimulationError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'simulation', payload: error });
    }, []),

    // Players actions
    setPlayersLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'players', payload: loading });
    }, []),

    setChelseaPlayers: useCallback((players) => {
      dispatch({ type: DRAFT_ACTIONS.SET_CHELSEA_PLAYERS, payload: players });
    }, []),

    setPlayersError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'players', payload: error });
    }, []),

    // Picks actions
    setPicksLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'picks', payload: loading });
    }, []),

    setDraftPicks: useCallback((picks) => {
      dispatch({ type: DRAFT_ACTIONS.SET_DRAFT_PICKS, payload: picks });
    }, []),

    addDraftPick: useCallback((pick) => {
      dispatch({ type: DRAFT_ACTIONS.ADD_DRAFT_PICK, payload: pick });
    }, []),

    updateDraftPick: useCallback((pick) => {
      dispatch({ type: DRAFT_ACTIONS.UPDATE_DRAFT_PICK, payload: pick });
    }, []),

    removeDraftPick: useCallback((pickId) => {
      dispatch({ type: DRAFT_ACTIONS.REMOVE_DRAFT_PICK, payload: pickId });
    }, []),

    setPicksError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'picks', payload: error });
    }, []),

    // Leaderboard actions
    setLeaderboardLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'leaderboard', payload: loading });
    }, []),

    setLeaderboard: useCallback((leaderboard) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LEADERBOARD, payload: leaderboard });
    }, []),

    setLeaderboardError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'leaderboard', payload: error });
    }, []),

    // Live scores actions
    setLiveScoresLoading: useCallback((loading) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LOADING, section: 'liveScores', payload: loading });
    }, []),

    setLiveScores: useCallback((scores) => {
      dispatch({ type: DRAFT_ACTIONS.SET_LIVE_SCORES, payload: scores });
    }, []),

    setLiveScoresError: useCallback((error) => {
      dispatch({ type: DRAFT_ACTIONS.SET_ERROR, section: 'liveScores', payload: error });
    }, []),

    // Reset action
    resetState: useCallback(() => {
      dispatch({ type: DRAFT_ACTIONS.RESET_STATE });
    }, [])
  };

  // Enhanced API actions that update context
  const enhancedActions = {
    ...actions,

    fetchDraftData: useCallback(async() => {
      try {
        actions.setDraftLoading(true);
        await fetchDraftData();
        // The hook will handle updating the context through the existing state
      } catch (error) {
        actions.setDraftError(error);
      }
    }, [fetchDraftData, actions]),

    fetchLiveScores: useCallback(async() => {
      try {
        actions.setLiveScoresLoading(true);
        await fetchLiveScores();
      } catch (error) {
        actions.setLiveScoresError(error);
      }
    }, [fetchLiveScores, actions]),

    fetchLeaderboard: useCallback(async() => {
      try {
        actions.setLeaderboardLoading(true);
        await fetchLeaderboard();
      } catch (error) {
        actions.setLeaderboardError(error);
      }
    }, [fetchLeaderboard, actions]),

    startSimulation: useCallback(async() => {
      try {
        actions.setSimulationLoading(true);
        await startSimulation();
      } catch (error) {
        actions.setSimulationError(error);
      }
    }, [startSimulation, actions]),

    simulateGameweek: useCallback(async() => {
      try {
        actions.setSimulationLoading(true);
        await simulateGameweek();
      } catch (error) {
        actions.setSimulationError(error);
      }
    }, [simulateGameweek, actions]),

    draftPlayer: useCallback(async(playerId) => {
      try {
        actions.setPicksLoading(true);
        await draftPlayer(playerId);
      } catch (error) {
        actions.setPicksError(error);
      }
    }, [draftPlayer, actions])
  };

  const value = {
    state,
    actions: enhancedActions,
    // Computed values
    isDraftComplete: state.draft.status?.is_draft_complete || false,
    isSimulationActive: state.simulation.status?.is_simulation_mode || false,
    currentGameweek: state.simulation.status?.current_gameweek || 1,
    totalPlayers: state.players.chelsea.length,
    totalPicks: state.picks.data.length,
    isLoading: Object.values(state).some(section => section.loading),
    hasError: Object.values(state).some(section => section.error)
  };

  return (
    <DraftContext.Provider value={value}>
      {children}
    </DraftContext.Provider>
  );
};

// Hook to use draft context
export const useDraftContext = () => {
  const context = useContext(DraftContext);

  if (!context) {
    throw new Error('useDraftContext must be used within a DraftProvider');
  }
  return context;
};

// Selector hooks for specific parts of state
export const useDraftState = () => {
  const { state } = useDraftContext();

  return state.draft;
};

export const useSimulationState = () => {
  const { state } = useDraftContext();

  return state.simulation;
};

export const usePlayersState = () => {
  const { state } = useDraftContext();

  return state.players;
};

export const usePicksState = () => {
  const { state } = useDraftContext();

  return state.picks;
};

export const useLeaderboardState = () => {
  const { state } = useDraftContext();

  return state.leaderboard;
};

export const useLiveScoresState = () => {
  const { state } = useDraftContext();

  return state.liveScores;
};
