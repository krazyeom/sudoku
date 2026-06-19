import SudokuGame from '@/components/SudokuGame';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>스도쿠 듀얼</h1>
        </div>
      </section>

      <SudokuGame />

      <footer className={styles.footer}>
        <p className={styles.footerMeta}>
          <a href="https://github.com/krazyeom" target="_blank" rel="noreferrer">
            krazyeom
          </a>{' '}
          made by krazyeom
        </p>
        <div className={styles.footerLinks}>
          <a href="https://github.com/krazyeom/sudoku" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://github.com/krazyeom/sudoku" target="_blank" rel="noreferrer">
            open source
          </a>
        </div>
      </footer>
    </main>
  );
}
