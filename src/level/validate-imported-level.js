import Ajv from 'ajv';
import { CONFIG } from '../config.js';
import levelSchema from '../levels/schema.json';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(levelSchema);

const cloneLevel = (data) =>
  typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));

/**
 * @param {object} data
 * @returns {boolean}
 */
const isWorldPayload = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.format === 'snoopy-world-v1' && Array.isArray(data.stages)) return true;
  if (Array.isArray(data.stages) && data.stages.length > 0 && data.tiles === undefined) return true;
  return false;
};

/**
 * @param {object} level
 * @param {string} pathPrefix - e.g. "" or "stages[0]"
 * @returns {string[]}
 */
const collectSingleLevelErrors = (level, pathPrefix) => {
  const prefix = pathPrefix ? `${pathPrefix} ` : '';

  if (!validateSchema(level)) {
    const schemaErrors = (validateSchema.errors || []).map((e) => {
      const path = e.instancePath || '(root)';
      return `${prefix}${path} ${e.message}`.trim();
    });
    return schemaErrors.length ? schemaErrors : [`${prefix}does not match the level schema.`];
  }

  const errors = [];

  if (level.width !== CONFIG.GRID_WIDTH || level.height !== CONFIG.GRID_HEIGHT) {
    errors.push(`${prefix}width must be ${CONFIG.GRID_WIDTH} and height must be ${CONFIG.GRID_HEIGHT}.`);
  }

  const tiles = level.tiles;
  if (!Array.isArray(tiles) || tiles.length !== CONFIG.GRID_HEIGHT) {
    errors.push(`${prefix}tiles must be an array of exactly ${CONFIG.GRID_HEIGHT} rows.`);
  } else {
    for (let y = 0; y < tiles.length; y++) {
      const row = tiles[y];
      if (typeof row !== 'string' || row.length !== CONFIG.GRID_WIDTH) {
        errors.push(`${prefix}tiles[${y}] must be a string of length ${CONFIG.GRID_WIDTH}.`);
        break;
      }
    }
  }

  const entities = Array.isArray(level.entities) ? level.entities : [];
  const countType = (t) => entities.filter((e) => e && e.type === t).length;

  if (countType('woodstock') !== 4) {
    errors.push(`${prefix}The level must contain exactly 4 woodstock entities.`);
  }

  const spikeCount = countType('spike');
  if (spikeCount > 1) {
    errors.push(`${prefix}The level must contain 0 or 1 spike entity.`);
  }

  const ballCount = countType('ball');
  if (ballCount < 1 || ballCount > 2) {
    errors.push(`${prefix}The level must contain 1 or 2 ball entities.`);
  }

  const gw = CONFIG.GRID_WIDTH;
  const gh = CONFIG.GRID_HEIGHT;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e || typeof e !== 'object') continue;
    if (typeof e.x !== 'number' || typeof e.y !== 'number') continue;
    if (e.x < 0 || e.x >= gw || e.y < 0 || e.y >= gh) {
      errors.push(`${prefix}entities[${i}] has coordinates outside the ${gw}x${gh} grid.`);
      break;
    }
  }

  return errors;
};

/**
 * @param {unknown} data
 * @returns {{ ok: true, levels: object[], worldName: string } | { ok: false, errors: string[] }}
 */
export const validateImportedLevel = (data) => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['Root value must be a JSON object.'] };
  }

  if (isWorldPayload(data)) {
    const stages = data.stages;
    if (!Array.isArray(stages) || stages.length < 1) {
      return { ok: false, errors: ['World file must contain a non-empty "stages" array.'] };
    }

    const allErrors = [];
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage === null || typeof stage !== 'object' || Array.isArray(stage)) {
        allErrors.push(`stages[${i}] must be a level object.`);
        continue;
      }
      allErrors.push(...collectSingleLevelErrors(stage, `stages[${i}]`));
    }

    if (allErrors.length > 0) {
      return { ok: false, errors: allErrors };
    }

    const worldName = typeof data.name === 'string' ? data.name : '';
    return {
      ok: true,
      levels: stages.map((s) => cloneLevel(s)),
      worldName,
    };
  }

  const errors = collectSingleLevelErrors(data, '');
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const worldName = typeof data.name === 'string' ? data.name : '';
  return {
    ok: true,
    levels: [cloneLevel(data)],
    worldName,
  };
};
