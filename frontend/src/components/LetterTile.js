import React from 'react';

/**
 * Individual letter tile button for the letter rack.
 *
 * @param {string} letter - The letter to display
 * @param {boolean} selected - Whether this tile is currently selected
 * @param {function} onClick - Click handler
 */
function LetterTile({ letter, selected, onClick }) {
  return (
    <button
      className={`letter-tile ${selected ? 'selected' : ''}`}
      onClick={onClick}
      disabled={selected}
    >
      {letter}
    </button>
  );
}

export default LetterTile;
