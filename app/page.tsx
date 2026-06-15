import SudokuGame from '@/components/SudokuGame';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>ZenGrid 스도쿠</h1>
          <p className={styles.description}>
            Easy / Medium / Hard 난이도의 스도쿠를 차분하게 풀어보세요.
            모든 퍼즐은 공개되기 전에 해답이 하나뿐인지 검증됩니다.
          </p>
        </div>
      </section>

      <SudokuGame />
    </main>
  );
}
