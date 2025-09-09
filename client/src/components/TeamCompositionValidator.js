import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

function TeamCompositionValidator({ picks, availablePlayers }) {
  const getTeamComposition = (picks) => {
    const gkDef = picks.filter(pick => {
      const player = availablePlayers.find(p => p.id === pick.player_id);
      return player && (player.position === 'GK' || player.position === 'DEF');
    }).length;
    
    const midFwd = picks.filter(pick => {
      const player = availablePlayers.find(p => p.id === pick.player_id);
      return player && (player.position === 'MID' || player.position === 'FWD');
    }).length;

    return { gkDef, midFwd };
  };

  const { gkDef, midFwd } = getTeamComposition(picks);
  const total = gkDef + midFwd;
  const isComplete = total === 5 && gkDef === 2 && midFwd === 3;
  const isValid = gkDef <= 2 && midFwd <= 3 && total <= 5;

  const getValidationMessage = () => {
    if (total === 0) {
      return { type: 'info', message: 'No players selected yet' };
    }
    
    if (total < 5) {
      if (gkDef < 2) {
        return { 
          type: 'warning', 
          message: `Need ${2 - gkDef} more GK/DEF player${2 - gkDef === 1 ? '' : 's'}` 
        };
      }
      if (midFwd < 3) {
        return { 
          type: 'warning', 
          message: `Need ${3 - midFwd} more MID/FWD player${3 - midFwd === 1 ? '' : 's'}` 
        };
      }
    }
    
    if (total === 5 && gkDef === 2 && midFwd === 3) {
      return { type: 'success', message: 'Team composition is complete and valid!' };
    }
    
    if (gkDef > 2) {
      return { type: 'error', message: 'Too many GK/DEF players (max 2)' };
    }
    
    if (midFwd > 3) {
      return { type: 'error', message: 'Too many MID/FWD players (max 3)' };
    }
    
    return { type: 'info', message: 'Team composition is valid so far' };
  };

  const validation = getValidationMessage();

  return (
    <div className={`p-3 rounded-md border ${
      validation.type === 'success' ? 'bg-green-50 border-green-200' :
      validation.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
      validation.type === 'error' ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center">
        {validation.type === 'success' ? (
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
        ) : (
          <AlertCircle className={`h-4 w-4 mr-2 ${
            validation.type === 'error' ? 'text-red-600' :
            validation.type === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            validation.type === 'success' ? 'text-green-800' :
            validation.type === 'warning' ? 'text-yellow-800' :
            validation.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {validation.message}
          </p>
          <div className="mt-1 text-xs text-gray-600">
            Current: {gkDef} GK/DEF, {midFwd} MID/FWD ({total}/5 players)
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamCompositionValidator;
