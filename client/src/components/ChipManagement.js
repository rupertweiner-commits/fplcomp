import React, { useState, useEffect } from 'react';
import PokerChip from './PokerChip';
import './ChipManagement.css';

const ChipManagement = ({ currentUser }) => {
  const [chips, setChips] = useState([]);
  const [gameweekStatus, setGameweekStatus] = useState(null);
  const [selectedChip, setSelectedChip] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChips();
    fetchGameweekStatus();
  }, []);

  const fetchChips = async () => {
    try {
      const response = await fetch(`/api/user-chips?userId=${currentUser.id}`);
      const data = await response.json();
      setChips(data.chips || []);
    } catch (err) {
      setError('Failed to fetch chips');
      console.error('Error fetching chips:', err);
    }
  };

  const fetchGameweekStatus = async () => {
    try {
      const response = await fetch('/api/players?action=current-gameweek');
      const data = await response.json();
      setGameweekStatus(data);
    } catch (err) {
      setError('Failed to fetch gameweek status');
      console.error('Error fetching gameweek status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setTargets(data.users || []);
    } catch (err) {
      setError('Failed to fetch targets');
      console.error('Error fetching targets:', err);
    }
  };

  const handleChipClick = async (chip) => {
    if (!gameweekStatus?.chip_usage_active) {
      alert('Chip usage is currently closed. Please wait for the next gameweek deadline.');
      return;
    }

    setSelectedChip(chip);
    
    // Fetch targets for competitive chips
    if (chip.effect_type !== 'self_buff') {
      await fetchTargets();
    }
  };

  const handleUseChip = async (targetId = null) => {
    if (!selectedChip) return;

    try {
      const response = await fetch('/api/use-chip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          chipType: selectedChip.chip_name,
          targetUserId: targetId,
          gameweek: gameweekStatus?.current?.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Chip used successfully! ${data.message}`);
        setSelectedChip(null);
        fetchChips(); // Refresh chips
      } else {
        alert(`Failed to use chip: ${data.error}`);
      }
    } catch (err) {
      alert('Error using chip');
      console.error('Error using chip:', err);
    }
  };

  const openLootBox = async () => {
    try {
      const response = await fetch('/api/open-loot-box', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`You received: ${data.chip.name} (${data.chip.rarity})`);
        fetchChips(); // Refresh chips
      } else {
        alert(`Failed to open loot box: ${data.error}`);
      }
    } catch (err) {
      alert('Error opening loot box');
      console.error('Error opening loot box:', err);
    }
  };

  if (loading) {
    return <div className="chip-management-loading">Loading chip system...</div>;
  }

  return (
    <div className="chip-management">
      <div className="chip-management-header">
        <h2>🎮 Chip System</h2>
        <div className="gameweek-status">
          {gameweekStatus && (
            <div className={`status-indicator ${gameweekStatus.chip_usage_active ? 'active' : 'inactive'}`}>
              {gameweekStatus.chip_usage_active ? '🟢 Active' : '🔴 Inactive'}
            </div>
          )}
        </div>
      </div>

      {gameweekStatus && (
        <div className="gameweek-info">
          <p>{gameweekStatus.chip_usage_message}</p>
          {gameweekStatus.chip_usage_active && (
            <p>Time remaining: {gameweekStatus.current.hours_until_deadline}h {gameweekStatus.current.minutes_until_deadline}m</p>
          )}
        </div>
      )}

      <div className="loot-box-section">
        <button 
          className="loot-box-button"
          onClick={openLootBox}
          disabled={!gameweekStatus?.chip_usage_active}
        >
          🎁 Open Daily Loot Box
        </button>
      </div>

      <div className="chips-section">
        <h3>Your Chips ({chips.length})</h3>
        <div className="chips-grid">
          {chips.map((chip) => (
            <PokerChip
              key={chip.chip_id}
              chip={chip}
              onClick={() => handleChipClick(chip)}
              isDisabled={!gameweekStatus?.chip_usage_active}
            />
          ))}
        </div>
      </div>

      {selectedChip && (
        <div className="chip-modal">
          <div className="chip-modal-content">
            <h3>Use {selectedChip.chip_name}</h3>
            <p>{selectedChip.chip_description}</p>
            
            {selectedChip.effect_type === 'self_buff' ? (
              <div className="self-buff-chips">
                <p>This chip affects your own team.</p>
                <div className="modal-buttons">
                  <button 
                    className="confirm-button"
                    onClick={() => handleUseChip()}
                  >
                    Use Chip
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => setSelectedChip(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="competitive-chips">
                <p>Select a target:</p>
                <div className="targets-list">
                  {targets.map((target) => (
                    <div 
                      key={target.id}
                      className="target-option"
                      onClick={() => handleUseChip(target.id)}
                    >
                      <span className="target-name">{target.first_name} {target.last_name}</span>
                      <span className="target-points">{target.total_points} pts</span>
                    </div>
                  ))}
                </div>
                <button 
                  className="cancel-button"
                  onClick={() => setSelectedChip(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default ChipManagement;
