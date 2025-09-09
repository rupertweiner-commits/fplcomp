import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamManagementTab from '../../../components/tabs/TeamManagementTab';

// Mock dependencies
jest.mock('../../../config/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: [],
      error: null
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }))
}));

describe('TeamManagementTab Component', () => {
  const mockProps = {
    currentUser: {
      id: '1',
      email: 'admin@test.com',
      isAdmin: true
    },
    draftStatus: {
      users: [
        { id: '1', email: 'user1@test.com', isAdmin: false },
        { id: '2', email: 'user2@test.com', isAdmin: false }
      ]
    },
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders team management interface', () => {
    render(<TeamManagementTab {...mockProps} />);

    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Assign players to teams and manage transfers.')).toBeInTheDocument();
  });

  it('shows user selection dropdown', () => {
    render(<TeamManagementTab {...mockProps} />);

    expect(screen.getByText('Select User to Manage')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Choose a user...')).toBeInTheDocument();
  });

  it('displays available users in dropdown', () => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    expect(dropdown).toBeInTheDocument();

    // Check if users are in the dropdown options
    expect(screen.getByText('user1@test.com (Admin)')).toBeInTheDocument();
    expect(screen.getByText('user2@test.com (Admin)')).toBeInTheDocument();
  });

  it('shows available players section', () => {
    render(<TeamManagementTab {...mockProps} />);

    expect(screen.getByText('Available Players')).toBeInTheDocument();
  });

  it('handles user selection', async() => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    fireEvent.change(dropdown, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText("user1@test.com's Team (0/5)")).toBeInTheDocument();
    });
  });

  it('shows team selection interface when user is selected', async() => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    fireEvent.change(dropdown, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText("user1@test.com's Team (0/5)")).toBeInTheDocument();
      expect(screen.getByText('Save Team')).toBeInTheDocument();
      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });
  });

  it('shows chips management when user is selected', async() => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    fireEvent.change(dropdown, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Chips')).toBeInTheDocument();
      expect(screen.getByText('Wildcard')).toBeInTheDocument();
      expect(screen.getByText('Free Hit')).toBeInTheDocument();
      expect(screen.getByText('Bench Boost')).toBeInTheDocument();
      expect(screen.getByText('Triple Captain')).toBeInTheDocument();
    });
  });

  it('disables save team button when team is incomplete', async() => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    fireEvent.change(dropdown, { target: { value: '1' } });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Team');

      expect(saveButton).toBeDisabled();
    });
  });

  it('handles clear selection', async() => {
    render(<TeamManagementTab {...mockProps} />);

    const dropdown = screen.getByDisplayValue('Choose a user...');

    fireEvent.change(dropdown, { target: { value: '1' } });

    await waitFor(() => {
      const clearButton = screen.getByText('Clear Selection');

      fireEvent.click(clearButton);
    });
  });

  it('shows loading state when draft status is not available', () => {
    const propsWithoutDraft = {
      ...mockProps,
      draftStatus: null
    };

    render(<TeamManagementTab {...propsWithoutDraft} />);

    expect(screen.getByText('Loading team management data...')).toBeInTheDocument();
  });

  it('handles missing users gracefully', () => {
    const propsWithoutUsers = {
      ...mockProps,
      draftStatus: { users: [] }
    };

    render(<TeamManagementTab {...propsWithoutUsers} />);

    expect(screen.getByText('Choose a user...')).toBeInTheDocument();
  });
});
