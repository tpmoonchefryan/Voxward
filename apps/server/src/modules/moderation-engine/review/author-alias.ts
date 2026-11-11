/**
 * Temporary author aliases for one review task (proposal section 5.4). The model sees an alias so that messages from
 * one author in the same batch keep their context. Each task creates a new table with its own nonce, so an alias
 * does not identify the same author in another task. The alias never contains the sender reference.
 */
export interface TaskAliasTable {
  aliasFor(subjectRef: string): string;
}

export function createTaskAliasTable(nonce: string): TaskAliasTable {
  if (nonce.trim() === "") throw new Error("TASK_ALIAS_NONCE_INVALID");
  const aliases = new Map<string, string>();
  return {
    aliasFor(subjectRef) {
      const known = aliases.get(subjectRef);
      if (known !== undefined) return known;
      const alias = `a-${nonce}-${aliases.size + 1}`;
      aliases.set(subjectRef, alias);
      return alias;
    },
  };
}
