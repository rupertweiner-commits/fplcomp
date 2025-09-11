import React from 'react';
import './PokerChip.css';

const PokerChip = ({ 
  chip, 
  onClick, 
  isSelected = false, 
  isDisabled = false,
  size = 'medium' 
}) => {
  const getChipClass = () => {
    let baseClass = 'poker-chip';
    baseClass += ` poker-chip--${chip.rarity}`;
    baseClass += ` poker-chip--${size}`;
    if (isSelected) baseClass += ' poker-chip--selected';
    if (isDisabled) baseClass += ' poker-chip--disabled';
    return baseClass;
  };

  const getChipStyle = () => {
    return {
      background: chip.gradient,
      borderColor: chip.borderColor,
      color: chip.textColor
    };
  };

  return (
    <div 
      className={getChipClass()}
      style={getChipStyle()}
      onClick={!isDisabled ? onClick : undefined}
      title={`${chip.name} (${chip.rarity})`}
    >
      <div className="poker-chip__icon">
        {chip.icon}
      </div>
      <div className="poker-chip__rarity">
        {chip.rarity.toUpperCase()}
      </div>
      <div className="poker-chip__value">
        {chip.effect_value || ''}
      </div>
    </div>
  );
};

export default PokerChip;
