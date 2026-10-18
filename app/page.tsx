import SudokuGame from '@/components/SudokuGame';
import SudokuDuelLogo from '@/components/sudoku/SudokuDuelLogo';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <SudokuDuelLogo size="md" />
          <span className={styles.versionTag}>v2.0</span>
        </div>
      </header>

      <SudokuGame />

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span>© 2026 <a href="https://github.com/krazyeom" target="_blank" rel="noreferrer">krazyeom</a></span>
        </div>
        <div className={styles.footerHotkeys}>
          <span>Keys:</span>
          <kbd>1–9</kbd>
          <kbd>Arrows</kbd>
          <kbd>Del</kbd>
          <kbd>N</kbd>
          <kbd>I</kbd>
          <kbd>H</kbd>
        </div>
      </footer>
    </main>
  );
}
