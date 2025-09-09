import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimulationTab from '../../../components/tabs/SimulationTab';

// Mock dependencies
jest.mock('../../../config/supabase', () => ({
  auth: {
    signOut: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('SimulationTab Component', () => {
  const mockProps = {
    currentUser: {
      id: '1',
      email: 'test@test.com',
      isAdmin: true
    },
    draftStatus: {
      users: [
        { id: '1', email: 'user1@test.com' },
        { id: '2', email: 'user2@test.com' }
      ],
      draftedCount: 0
    },
    simulationStatus: {
      current_gameweek: 1,
      is_draft_complete: false
    },
    leaderboard: [],
    onRefresh: jest.fn(),
    onStartSimulation: jest.fn(),
    onSimulateGameweek: jest.fn(),
    onRefreshLeaderboard: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('renders simulation controls for admin users', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('Live FPL Mode')).toBeInTheDocument();
    expect(screen.getByText('Enter Simulation')).toBeInTheDocument();
    expect(screen.getByText('Simulate Current Gameweek')).toBeInTheDocument();
  });

  it('shows admin access granted message for admin users', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('Admin Access Granted')).toBeInTheDocument();
    expect(screen.getByText('Welcome Rupert! You have full access to all simulation features.')).toBeInTheDocument();
  });

  it('shows admin access required message for non-admin users', () => {
    const nonAdminProps = {
      ...mockProps,
      currentUser: { ...mockProps.currentUser, isAdmin: false }
    };

    render(<SimulationTab {...nonAdminProps} />);

    expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
    expect(screen.getByText('Simulation features are only available to Rupert (Admin).')).toBeInTheDocument();
  });

  it('displays current gameweek correctly', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Current Gameweek')).toBeInTheDocument();
  });

  it('displays player count correctly', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  it('calls onStartSimulation when Enter Simulation is clicked', async() => {
    render(<SimulationTab {...mockProps} />);

    const button = screen.getByText('Enter Simulation');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockProps.onStartSimulation).toHaveBeenCalled();
    });
  });

  it('calls onSimulateGameweek when Simulate Current Gameweek is clicked', async() => {
    const completedDraftProps = {
      ...mockProps,
      simulationStatus: {
        ...mockProps.simulationStatus,
        is_draft_complete: true
      }
    };

    render(<SimulationTab {...completedDraftProps} />);

    const button = screen.getByText('Simulate Current Gameweek');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockProps.onSimulateGameweek).toHaveBeenCalled();
    });
  });

  it('disables Simulate Current Gameweek when draft is not complete', () => {
    render(<SimulationTab {...mockProps} />);

    const button = screen.getByText('Simulate Current Gameweek');

    expect(button).toBeDisabled();
  });

  it('shows reset simulation button for admin users', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('Reset All')).toBeInTheDocument();
  });

  it('disables buttons when user is not admin', () => {
    const nonAdminProps = {
      ...mockProps,
      currentUser: { ...mockProps.currentUser, isAdmin: false }
    };

    render(<SimulationTab {...nonAdminProps} />);

    const enterButton = screen.getByText('Enter Simulation');
    const simulateButton = screen.getByText('Simulate Current Gameweek');
    const resetButton = screen.getByText('Reset All');

    expect(enterButton).toBeDisabled();
    expect(simulateButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  it('displays mode hint', () => {
    render(<SimulationTab {...mockProps} />);

    expect(screen.getByText('Live Mode: Using real FPL data and current gameweek status.')).toBeInTheDocument();
  });

  it('handles missing simulation status gracefully', () => {
    const propsWithoutSimulation = {
      ...mockProps,
      simulationStatus: null
    };

    render(<SimulationTab {...propsWithoutSimulation} />);

    expect(screen.getByText('1')).toBeInTheDocument(); // Should default to 1
  });

  it('handles missing draft status gracefully', () => {
    const propsWithoutDraft = {
      ...mockProps,
      draftStatus: null
    };

    render(<SimulationTab {...propsWithoutDraft} />);

    expect(screen.getByText('0')).toBeInTheDocument(); // Should default to 0
  });
});
