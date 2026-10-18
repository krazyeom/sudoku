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
        <div className={styles.footerContent}>
          <p className={styles.copyright}>
            <span>© 2026 <strong>Sudoku Duel</strong></span>
            <span className={styles.dot}>•</span>
            <span>
              Made by{' '}
              <a
                href="https://github.com/krazyeom"
                target="_blank"
                rel="noreferrer"
                className={styles.authorLink}
              >
                krazyeom
              </a>
            </span>
          </p>

          <div className={styles.footerHotkeys}>
            <span className={styles.hotkeyLabel}>Quick Keys</span>
            <kbd>1–9</kbd>
            <kbd>Arrows</kbd>
            <kbd>Del</kbd>
            <kbd>N Note</kbd>
            <kbd>H Hint</kbd>
          </div>
        </div>
      </footer>
    </main>
  );
}
