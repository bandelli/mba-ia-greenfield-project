import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { ReactionType } from './entities/video-reaction.entity';

const PG_UNIQUE_VIOLATION = '23505';

export function isPgUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

export function reactionCounterColumn(
  type: ReactionType,
): 'likes_count' | 'dislikes_count' {
  return type === ReactionType.LIKE ? 'likes_count' : 'dislikes_count';
}

interface ReactionRow {
  id: string;
  type: ReactionType;
}

// Shared idempotent "set state" persistence for a (user, target) reaction
// row — identical logic previously hand-mirrored between VideoReactionService
// and CommentReactionService (per social-interactions/TD-01, TD-02, TD-03).
// A unique-constraint violation on insert aborts the enclosing transaction in
// Postgres unless it happens inside a SAVEPOINT (per
// .claude/rules/typeorm-queries.md); wrapped so a concurrent request racing
// on the same (user, target) pair is resolved by re-reading the row it just
// inserted instead of failing.
export async function persistReactionToggle<T extends ReactionRow>(
  manager: EntityManager,
  repository: Repository<T>,
  existing: T | null,
  savepointName: string,
  create: () => T,
  findByKey: () => Promise<T>,
  type: ReactionType | null,
): Promise<ReactionType | null> {
  if (existing) {
    if (existing.type === type) {
      return existing.type; // idempotent no-op
    }
    if (type === null) {
      await repository.delete({ id: existing.id } as never);
    } else {
      await repository.update(
        { id: existing.id } as never,
        {
          type,
        } as never,
      );
    }
    return existing.type;
  }

  if (type === null) {
    return null; // nothing to remove — idempotent no-op
  }

  await manager.query(`SAVEPOINT ${savepointName}`);
  try {
    await repository.save(create());
    await manager.query(`RELEASE SAVEPOINT ${savepointName}`);
    return null;
  } catch (err) {
    await manager.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    if (!isPgUniqueViolation(err)) {
      throw err;
    }
    // A concurrent request for the same (user, target) pair won the race —
    // re-read the row it just inserted and fall back to the update/no-op path.
    const raced = await findByKey();
    if (raced.type === type) {
      return raced.type;
    }
    await repository.update({ id: raced.id } as never, { type } as never);
    return raced.type;
  }
}

interface CounterTarget {
  likes_count: number;
  dislikes_count: number;
}

// Shared atomic `UPDATE ... RETURNING` counter adjustment (per
// phase-05-video-watch-page/TD-02's pattern) — identical logic previously
// hand-mirrored between VideoReactionService (on Video) and
// CommentReactionService (on Comment).
export async function applyReactionCounterDelta<T extends CounterTarget>(
  manager: EntityManager,
  targetEntity: new () => T,
  targetId: string,
  previousType: ReactionType | null,
  nextType: ReactionType | null,
): Promise<{ likesCount: number; dislikesCount: number }> {
  if (previousType === nextType) {
    const current = await manager.findOneByOrFail(targetEntity, {
      id: targetId,
    } as never);
    return {
      likesCount: current.likes_count,
      dislikesCount: current.dislikes_count,
    };
  }

  const deltas: Partial<Record<'likes_count' | 'dislikes_count', number>> = {};
  if (previousType) {
    const column = reactionCounterColumn(previousType);
    deltas[column] = (deltas[column] ?? 0) - 1;
  }
  if (nextType) {
    const column = reactionCounterColumn(nextType);
    deltas[column] = (deltas[column] ?? 0) + 1;
  }

  const setClause: Record<string, () => string> = {};
  for (const [column, delta] of Object.entries(deltas)) {
    setClause[column] = () => `${column} + (${delta})`;
  }

  const result = await manager
    .createQueryBuilder()
    .update(targetEntity)
    .set(setClause)
    .where('id = :id', { id: targetId })
    .returning(['likes_count', 'dislikes_count'])
    .execute();
  const [row] = result.raw as {
    likes_count: number;
    dislikes_count: number;
  }[];
  return { likesCount: row.likes_count, dislikesCount: row.dislikes_count };
}
