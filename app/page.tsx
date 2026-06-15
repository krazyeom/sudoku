import SudokuGame from '@/components/SudokuGame';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>ZenGrid Sudoku</h1>
          <p className={styles.description}>
            상 · 중 · 하 난이도로 바로 시작하는 모던 스타일의 수도쿠 앱입니다.
            퍼즐은 매번 해답이 존재하고, 단일 해답만 나오도록 검증해서 생성합니다.
          </p>
        </div>
      </section>

      <SudokuGame />
    </main>
  );
}
