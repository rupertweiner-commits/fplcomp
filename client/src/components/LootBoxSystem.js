import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Star, 
  Zap, 
  Crown, 
  Sparkles,
  Trophy,
  Target,
  RefreshCw
} from 'lucide-react';

function LootBoxSystem({ currentUser, leaderboardPosition, onChipReceived }) {
  const [isOpen, setIsOpen] = useState(false);
  const [canOpen, setCanOpen] = useState(true);
  const [lastOpened, setLastOpened] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [revealedChip, setRevealedChip] = useState(null);
  const [animationPhase, setAnimationPhase] = useState('idle'); // idle, selecting, opening, revealing, complete

  // Chip definitions with rarity and effects
  const chipDefinitions = {
    common: [
      { name: 'Transfer Boost', description: '1 extra transfer this week', icon: RefreshCw, color: 'gray' },
      { name: 'Form Boost', description: '+10% points for one player', icon: Target, color: 'gray' },
      { name: 'Captain Insurance', description: 'Captain gets 5 points if they score 0', icon: Shield, color: 'gray' },
      { name: 'Bench Safety', description: 'Auto-substitute if starter doesn\'t play', icon: Users, color: 'gray' }
    ],
    rare: [
      { name: 'Double Captain', description: 'Captain scores double points', icon: Crown, color: 'blue' },
      { name: 'Form Surge', description: 'All players get +15% points', icon: Zap, color: 'blue' },
      { name: 'Transfer Frenzy', description: '3 extra transfers this week', icon: RefreshCw, color: 'blue' },
      { name: 'Lucky Break', description: 'One random player gets +20 points', icon: Star, color: 'blue' }
    ],
    epic: [
      { name: 'Wildcard', description: 'Unlimited transfers for one gameweek', icon: RefreshCw, color: 'purple' },
      { name: 'Captain\'s Shield', description: 'Captain can\'t score negative points', icon: Shield, color: 'purple' },
      { name: 'Team Boost', description: 'All players get +25% points', icon: Zap, color: 'purple' },
      { name: 'Transfer Master', description: '5 extra transfers this week', icon: RefreshCw, color: 'purple' }
    ],
    legendary: [
      { name: 'Time Rewind', description: 'Undo your last transfer', icon: RotateCcw, color: 'gold' },
      { name: 'Perfect Storm', description: 'All players get +50% points', icon: Zap, color: 'gold' },
      { name: 'Transfer God', description: 'Unlimited transfers for 2 gameweeks', icon: RefreshCw, color: 'gold' },
      { name: 'Captain\'s Crown', description: 'Captain scores quadruple points', icon: Crown, color: 'gold' }
    ]
  };

  // Calculate drop rates based on leaderboard position
  const getDropRates = (position) => {
    if (position <= 1) return { common: 50, rare: 30, epic: 15, legendary: 5 };
    if (position <= 3) return { common: 55, rare: 28, epic: 14, legendary: 3 };
    if (position <= 6) return { common: 60, rare: 25, epic: 12, legendary: 3 };
    if (position <= 10) return { common: 65, rare: 22, epic: 10, legendary: 3 };
    if (position <= 15) return { common: 70, rare: 20, epic: 8, legendary: 2 };
    return { common: 75, rare: 18, epic: 6, legendary: 1 };
  };

  // Weighted random selection
  const selectRandomChip = () => {
    const rates = getDropRates(leaderboardPosition);
    const random = Math.random() * 100;
    
    let cumulative = 0;
    for (const [rarity, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (random <= cumulative) {
        const chips = chipDefinitions[rarity];
        return {
          ...chips[Math.floor(Math.random() * chips.length)],
          rarity: rarity.toUpperCase()
        };
      }
    }
    
    // Fallback to common
    const commonChips = chipDefinitions.common;
    return {
      ...commonChips[Math.floor(Math.random() * commonChips.length)],
      rarity: 'COMMON'
    };
  };

  const handleBoxSelect = (boxNumber) => {
    if (!canOpen || animationPhase !== 'idle') return;
    
    setSelectedBox(boxNumber);
    setAnimationPhase('selecting');
    
    // Start opening sequence
    setTimeout(() => {
      setAnimationPhase('opening');
      const chip = selectRandomChip();
      setRevealedChip(chip);
      
      setTimeout(() => {
        setAnimationPhase('revealing');
        onChipReceived && onChipReceived(chip);
        
        setTimeout(() => {
          setAnimationPhase('complete');
          setLastOpened(new Date());
          setCanOpen(false);
          
          // Reset after 3 seconds
          setTimeout(() => {
            setAnimationPhase('idle');
            setSelectedBox(null);
            setRevealedChip(null);
          }, 3000);
        }, 2000);
      }, 1500);
    }, 1000);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON': return 'text-gray-600 bg-gray-100 border-gray-300';
      case 'RARE': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'EPIC': return 'text-purple-600 bg-purple-100 border-purple-300';
      case 'LEGENDARY': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getRarityGlow = (rarity) => {
    switch (rarity) {
      case 'COMMON': return 'shadow-gray-200';
      case 'RARE': return 'shadow-blue-200';
      case 'EPIC': return 'shadow-purple-200';
      case 'LEGENDARY': return 'shadow-yellow-200';
      default: return 'shadow-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <Gift className="h-8 w-8 mr-2 text-purple-600" />
          Daily Loot Box
        </h2>
        <p className="text-gray-600">
          Position #{leaderboardPosition} • {canOpen ? 'Ready to open!' : 'Come back tomorrow!'}
        </p>
      </div>

      {/* Loot Box Selection */}
      {animationPhase === 'idle' && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((boxNumber) => (
            <button
              key={boxNumber}
              onClick={() => handleBoxSelect(boxNumber)}
              disabled={!canOpen}
              className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                canOpen
                  ? 'border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 cursor-pointer'
                  : 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="text-4xl mb-2">🎁</div>
              <div className="text-sm font-medium text-gray-700">Box {boxNumber}</div>
            </button>
          ))}
        </div>
      )}

      {/* Opening Animation */}
      {animationPhase === 'selecting' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4 animate-bounce">🎁</div>
          <p className="text-lg text-gray-600">Opening your loot box...</p>
        </div>
      )}

      {animationPhase === 'opening' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4 animate-spin">⚡</div>
          <p className="text-lg text-gray-600">Something amazing is inside...</p>
        </div>
      )}

      {/* Chip Reveal */}
      {animationPhase === 'revealing' && revealedChip && (
        <div className="text-center py-8">
          <div className={`inline-block p-6 rounded-lg border-2 ${getRarityColor(revealedChip.rarity)} ${getRarityGlow(revealedChip.rarity)} animate-pulse`}>
            <div className="text-4xl mb-4">✨</div>
            <div className="text-2xl font-bold mb-2">{revealedChip.name}</div>
            <div className="text-sm opacity-75">{revealedChip.description}</div>
            <div className="text-xs font-medium mt-2 uppercase tracking-wide">
              {revealedChip.rarity} CHIP
            </div>
          </div>
        </div>
      )}

      {/* Complete */}
      {animationPhase === 'complete' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg text-gray-600">Chip added to your collection!</p>
          <p className="text-sm text-gray-500 mt-2">Come back tomorrow for another loot box!</p>
        </div>
      )}

      {/* Drop Rate Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Your Drop Rates (Position #{leaderboardPosition})</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(getDropRates(leaderboardPosition)).map(([rarity, rate]) => (
            <div key={rarity} className="flex justify-between">
              <span className="capitalize">{rarity}:</span>
              <span className="font-medium">{rate}%</span>
            </div>
          ))}
        </div>
        {leaderboardPosition > 10 && (
          <p className="text-xs text-blue-600 mt-2">
            💡 You're getting better drop rates for being behind!
          </p>
        )}
      </div>
    </div>
  );
}

export default LootBoxSystem;
