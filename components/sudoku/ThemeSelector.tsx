import React, { useState } from 'react';
import styles from './sudoku.module.css';
import { THEME_LIST, type ThemeConfig, type ThemeId } from './theme';
import type { Locale } from './types';
import { PaletteIcon } from './Icons';
import { triggerHaptic } from '@/lib/haptics';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  locale: Locale;
  isOpen: boolean;
  onSelectTheme: (theme: ThemeId) => void;
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  locale,
  isOpen,
  onSelectTheme,
  onClose,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Board Game' | 'Season' | 'Nature/Sci-Fi'>('all');

  if (!isOpen) return null;

  const filteredThemes = THEME_LIST.filter((theme) => {
    if (categoryFilter === 'all') return true;
    return theme.categoryEn === categoryFilter;
  });

  const handleSelect = (themeId: ThemeId) => {
    triggerHaptic('selection');
    onSelectTheme(themeId);
    onClose();
  };

  const handleFilter = (f: 'all' | 'Board Game' | 'Season' | 'Nature/Sci-Fi') => {
    triggerHaptic('selection');
    setCategoryFilter(f);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`${styles.card} ${styles.themeModalCard}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Modal Header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerText}>
            <h3 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PaletteIcon size={18} color="var(--accent-primary, #ffffff)" />
              <span>{locale === 'ko' ? '컬러 테마 스튜디오' : 'Color Theme Studio'}</span>
            </h3>
            <p className={styles.subtitle} style={{ textTransform: 'none', letterSpacing: 'normal' }}>
              {locale === 'ko'
                ? '명품 보드게임(체스·장기), 계절 및 자연/우주 테마로 나만의 스도쿠를 꾸며보세요.'
                : 'Personalize your Sudoku with Luxury Board Game, Seasonal, and Nature themes.'}
            </p>
          </div>
          <button
            type="button"
            className={styles.themeModalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filter Category Tabs */}
        <div style={{ display: 'flex', gap: '6px', margin: '4px 0 10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`${styles.modeBtn} ${categoryFilter === 'all' ? styles.modeBtnActive : ''}`}
            onClick={() => handleFilter('all')}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            {locale === 'ko' ? '전체 테마' : 'All'}
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${categoryFilter === 'Board Game' ? styles.modeBtnActive : ''}`}
            onClick={() => handleFilter('Board Game')}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            {locale === 'ko' ? '♟️ 명품 보드게임' : '♟️ Board Game'}
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${categoryFilter === 'Season' ? styles.modeBtnActive : ''}`}
            onClick={() => handleFilter('Season')}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            {locale === 'ko' ? '계절 / 시즌' : 'Seasons'}
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${categoryFilter === 'Nature/Sci-Fi' ? styles.modeBtnActive : ''}`}
            onClick={() => handleFilter('Nature/Sci-Fi')}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            {locale === 'ko' ? '자연 / 우주' : 'Nature & Cosmos'}
          </button>
        </div>

        {/* Theme Grid */}
        <div className={styles.themeGrid}>
          {filteredThemes.map((theme: ThemeConfig) => {
            const isActive = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''}`}
                onClick={() => handleSelect(theme.id)}
              >
                <div className={styles.themeCardTop}>
                  <span className={styles.themeIcon}>{theme.icon}</span>
                  <div className={styles.themeNameWrap}>
                    <span className={styles.themeName}>
                      {locale === 'ko' ? theme.nameKo : theme.nameEn}
                    </span>
                    <span className={styles.themeCategoryBadge}>
                      {locale === 'ko' ? theme.categoryKo : theme.categoryEn}
                    </span>
                  </div>
                  {isActive && <span className={styles.themeActiveBadge}>{locale === 'ko' ? '적용중' : 'Active'}</span>}
                </div>

                <p className={styles.themeDesc}>
                  {locale === 'ko' ? theme.descKo : theme.descEn}
                </p>

                {/* Color Palette Preview Swatches */}
                <div className={styles.themePalette}>
                  <span
                    className={styles.themeColorDot}
                    style={{ backgroundColor: theme.bgColor, border: '1px solid rgba(255,255,255,0.2)' }}
                    title="Background"
                  />
                  <span
                    className={styles.themeColorDot}
                    style={{ backgroundColor: theme.accentColor }}
                    title="Accent"
                  />
                  <span
                    className={styles.themeColorDot}
                    style={{ backgroundColor: theme.secondaryColor }}
                    title="Secondary"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
