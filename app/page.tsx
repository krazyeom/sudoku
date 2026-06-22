import SudokuGame from '@/components/SudokuGame';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>1v1 sudoku duel</p>
          <h1 className={styles.title}>SudokuDuo</h1>
          <p className={styles.subtitle}>Fast matches, synced rooms, clean mobile play.</p>
        </div>
      </section>

      <SudokuGame />

      <footer className={styles.footer}>
        <span className={styles.footerMeta}>
          made by{' '}
          <a href="https://github.com/krazyeom" target="_blank" rel="noreferrer">
            krazyeom
          </a>
        </span>
        <a className={styles.footerLinks} href="https://github.com/krazyeom/sudoku" target="_blank" rel="noreferrer">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8.03c0 3.56 2.29 6.58 5.47 7.65.4.08.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.83.73 1.24 1.89.89 2.35.68.07-.53.28-.89.51-1.1-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.06-.01 1.91-.01 2.17 0 .21.15.46.55.38A8.03 8.03 0 0 0 16 8.03C16 3.58 12.42 0 8 0Z" />
          </svg>
          GitHub
        </a>
      </footer>
    </main>
  );
}
