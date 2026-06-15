import SudokuGame from '@/components/SudokuGame';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>ZenGrid Sudoku</h1>
          <p className={styles.description}>
            Modern sudoku with Easy / Medium / Hard modes.
            Every puzzle is validated to have exactly one solution before it is shown.
          </p>
        </div>
      </section>

      <SudokuGame />
    </main>
  );
}
