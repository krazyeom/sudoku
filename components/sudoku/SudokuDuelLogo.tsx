import React from 'react';
import styles from './SudokuDuelLogo.module.css';
import { CROSSWORD_TILES, type CrosswordTile } from './logoData';

export { CROSSWORD_TILES, type CrosswordTile };

interface SudokuDuelLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const SudokuDuelLogo: React.FC<SudokuDuelLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  return (
    <div className={`${styles.logoContainer} ${styles[size]} ${className}`} aria-label="SUDOKU DUEL Logo">
      {/* 4x6 Crossword Tile Matrix */}
      <div className={styles.gridMatrix} role="img" aria-label="SUDOKU DUEL crossword logo">
        {CROSSWORD_TILES.map((tile) => {
          const typeClass =
            tile.type === 'intersection'
              ? styles.tileIntersection
              : tile.type === 'duel'
              ? styles.tileDuel
              : styles.tileSudoku;

          return (
            <div
              key={`${tile.row}-${tile.col}-${tile.char}`}
              className={`${styles.tile} ${typeClass}`}
              style={{ gridRow: tile.row, gridColumn: tile.col }}
              title={tile.type === 'intersection' ? 'Intersection: SUDOKU × DUEL' : undefined}
            >
              <span>{tile.char}</span>
              {tile.type === 'intersection' && <span className={styles.nexusGlow} aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      {/* Brand Identity Text */}
      {showSubtitle && (
        <div className={styles.brandLabels}>
          <div className={styles.brandTitleRow}>
            <span className={styles.brandTitle}>SUDOKU</span>
            <span className={styles.brandTitleAccent}>DUEL</span>
          </div>
          <span className={styles.brandTagline}>1v1 Tactical Battle Arena</span>
        </div>
      )}
    </div>
  );
};

export default SudokuDuelLogo;
