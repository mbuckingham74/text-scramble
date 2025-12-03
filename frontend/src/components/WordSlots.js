import React from 'react';

/**
 * Displays word slots grouped by length.
 * Used during gameplay (hidden words) and on end screens (reveal all).
 *
 * @param {Object} wordsByLength - Object mapping length to array of words
 * @param {Array} foundWords - Array of words the player has found (uppercase)
 * @param {boolean} revealAll - If true, show all words; if false, hide unfound words
 */
function WordSlots({ wordsByLength, foundWords, revealAll = false }) {
  const lengths = Object.keys(wordsByLength).sort((a, b) => a - b);

  return (
    <>
      {lengths.map(length => (
        <div key={length} className="word-group">
          <h3>{length} Letters</h3>
          <div className="word-slots">
            {wordsByLength[length].map((word, idx) => {
              const upperWord = word.toUpperCase();
              const isFound = foundWords.includes(upperWord);
              const className = revealAll
                ? `word-slot ${isFound ? 'found' : 'missed'}`
                : `word-slot ${isFound ? 'found' : ''}`;
              const displayText = revealAll || isFound
                ? upperWord
                : word.replace(/./g, '_');

              return (
                <div key={idx} className={className}>
                  {displayText}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default WordSlots;
