import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowUpRight, FiFolderPlus, FiMoreHorizontal } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { getChampionIconUrl } from '../utils/championData';

export interface MatchupGuideSummary {
  id: string;
  myChampion: string;
  enemyChampion: string;
  role: string;
  difficulty: string;
  title?: string | null;
  description?: string | null;
  isPublic: boolean;
  userId?: string;
  authorId?: string;
  authorUsername?: string;
  isOwned?: boolean;
  isSaved?: boolean;
  updatedAt?: string;
}

interface Props {
  guide: MatchupGuideSummary;
  onOrganize?: (guide: MatchupGuideSummary) => void;
  onDropGuide?: (sourceId: string, targetId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUngroup?: () => void;
  onRemoveSaved?: () => void;
  sharedInCollection?: boolean;
}

export function MatchupGuideTile({
  guide,
  onOrganize,
  onDropGuide,
  onEdit,
  onDelete,
  onUngroup,
  onRemoveSaved,
  sharedInCollection = false,
}: Props) {
  const { t } = useLanguage();
  const [dropTarget, setDropTarget] = useState(false);
  const canOrganize = Boolean(onOrganize || onDropGuide);
  const title = guide.title || `${guide.myChampion} vs ${guide.enemyChampion}`;
  const hasMore = Boolean(onEdit || onDelete || onUngroup || onRemoveSaved);

  return (
    <article
      className={`matchup-guide-tile${dropTarget ? ' is-drop-target' : ''}`}
      draggable={canOrganize}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-rift-guide', guide.id);
        event.dataTransfer.setData('text/plain', guide.id);
      }}
      onDragOver={(event) => {
        if (
          !onDropGuide ||
          !event.dataTransfer.types.includes('application/x-rift-guide')
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDropTarget(false);
      }}
      onDrop={(event) => {
        if (!onDropGuide) return;
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(false);
        const sourceId = event.dataTransfer.getData('application/x-rift-guide');
        if (sourceId && sourceId !== guide.id) onDropGuide(sourceId, guide.id);
      }}
    >
      <div className="matchup-guide-tile-top">
        <div
          className="matchup-guide-portraits"
          aria-label={`${guide.myChampion} versus ${guide.enemyChampion}`}
        >
          <Image
            src={getChampionIconUrl(guide.myChampion)}
            alt={guide.myChampion}
            width={48}
            height={48}
            unoptimized
          />
          <span aria-hidden="true">vs</span>
          <Image
            src={getChampionIconUrl(guide.enemyChampion)}
            alt={guide.enemyChampion}
            width={48}
            height={48}
            unoptimized
          />
        </div>
        {hasMore ? (
          <details className="matchup-guide-more">
            <summary aria-label={`${title} actions`}>
              <FiMoreHorizontal aria-hidden="true" />
            </summary>
            <div>
              {onEdit ? (
                <button type="button" onClick={onEdit}>
                  {t('matchups.edit')}
                </button>
              ) : null}
              {onUngroup ? (
                <button type="button" onClick={onUngroup}>
                  {t('matchups.ungroup')}
                </button>
              ) : null}
              {onRemoveSaved ? (
                <button type="button" onClick={onRemoveSaved}>
                  {t('matchups.removeFromLibrary')}
                </button>
              ) : null}
              {onDelete ? (
                <button type="button" onClick={onDelete}>
                  {t('matchups.delete')}
                </button>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
      <h3>{title}</h3>
      <p className="matchup-guide-meta">
        <span>{guide.role}</span>
        <span aria-hidden="true">·</span>
        <span>
          {t(`matchups.difficulty.${guide.difficulty.toLowerCase()}` as any)}
        </span>
      </p>
      <div className="matchup-guide-byline">
        <span>
          {guide.authorUsername
            ? `${t('matchups.author')}: ${guide.authorUsername}`
            : ''}
        </span>
        <span>
          {guide.isPublic
            ? t('matchups.public')
            : sharedInCollection
            ? t('matchups.collectionAccess')
            : t('matchups.private')}
        </span>
      </div>
      <div className="matchup-guide-actions">
        <Link href={`/matchups/${guide.id}`}>
          {t('matchups.openGuide')} <FiArrowUpRight aria-hidden="true" />
        </Link>
        {onOrganize ? (
          <button type="button" onClick={() => onOrganize(guide)}>
            <FiFolderPlus aria-hidden="true" /> {t('matchups.organize')}
          </button>
        ) : null}
      </div>
      {dropTarget ? (
        <span className="matchup-guide-drop-label">
          {t('matchups.dropToGroup')}
        </span>
      ) : null}
    </article>
  );
}
