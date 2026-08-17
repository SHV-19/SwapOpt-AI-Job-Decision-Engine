import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  open,
  rename,
  stat,
  unlink
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { createRepository } from "./repository.js";

const ENTITY_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const INTERNAL_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const DANGEROUS_PROPERTY_NAMES =
  new Set([
    "__proto__",
    "constructor",
    "prototype"
  ]);

const STORAGE_DOCUMENT_KEYS =
  Object.freeze([
    "schemaVersion",
    "repositoryName",
    "entityName",
    "records"
  ]);

const REQUIRED_RECORD_FIELDS =
  Object.freeze([
    "id",
    "ownerId",
    "userId",
    "workspaceId",
    "createdAt",
    "updatedAt",
    "version"
  ]);

const SUPPORTED_OPTION_KEYS =
  new Set([
    "name",
    "entityName",
    "filePath",
    "idFactory",
    "clock",
    "maxFileBytes"
  ]);

const DIRECTORY_SYNC_IGNORED_ERROR_CODES =
  new Set([
    "EINVAL",
    "ENOTSUP",
    "EPERM",
    "EISDIR"
  ]);

const MAX_JSON_DEPTH =
  32;

const MAX_ID_GENERATION_ATTEMPTS =
  10;

const FILE_LOCK_RETRY_DELAY_MS =
  10;

const FILE_LOCK_STALE_AFTER_MS =
  10_000;

const FILE_LOCK_MAX_WAIT_MS =
  15_000;

const WINDOWS_FILE_LOCK_CONTENTION_ERROR_CODES =
  new Set([
    "EACCES",
    "EBUSY",
    "EPERM"
  ]);

const PROCESS_WIDE_SERIAL_EXECUTORS =
  new Map();

export const JSON_FILE_REPOSITORY_SCHEMA_VERSION =
  1;

export const DEFAULT_JSON_FILE_MAX_BYTES =
  10 * 1024 * 1024;

export const JSON_FILE_REPOSITORY_ERROR_CODES =
  Object.freeze({
    INVALID_STORAGE_DATA:
      "INVALID_STORAGE_DATA",

    STORAGE_READ_FAILED:
      "STORAGE_READ_FAILED",

    STORAGE_WRITE_FAILED:
      "STORAGE_WRITE_FAILED",

    STORAGE_LIMIT_EXCEEDED:
      "STORAGE_LIMIT_EXCEEDED",

    ID_GENERATION_FAILED:
      "ID_GENERATION_FAILED"
  });

export class JsonFileRepositoryError extends Error {
  constructor(
    message,
    {
      code,
      cause
    }
  ) {
    super(
      message,
      {
        cause
      }
    );

    this.name =
      "JsonFileRepositoryError";

    this.code =
      code;
  }
}

function isRecord(
  value
) {
  return (
    value !== null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}

function isPlainObject(
  value
) {
  if (
    !isRecord(
      value
    )
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
}

function assertPlainObject(
  value,
  message
) {
  if (
    !isPlainObject(
      value
    )
  ) {
    throw new TypeError(
      message
    );
  }
}

function assertSupportedOptionKeys(
  options
) {
  const unsupportedKeys =
    Reflect.ownKeys(
      options
    ).filter(
      (key) =>
        typeof key !==
          "string" ||
        !SUPPORTED_OPTION_KEYS.has(
          key
        )
    );

  if (
    unsupportedKeys.length >
    0
  ) {
    throw new RangeError(
      [
        "JSON-file repository options contain unsupported fields:",
        `${unsupportedKeys.map(String).join(", ")}.`
      ].join(" ")
    );
  }
}

function normaliseFilePath(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "JSON-file repository path must be a string."
    );
  }

  const trimmedValue =
    value.trim();

  if (
    trimmedValue ===
      "" ||
    trimmedValue.includes(
      "\u0000"
    )
  ) {
    throw new RangeError(
      "JSON-file repository path must not be blank or contain null characters."
    );
  }

  const resolvedPath =
    path.resolve(
      trimmedValue
    );

  if (
    resolvedPath ===
      path.parse(
        resolvedPath
      ).root
  ) {
    throw new RangeError(
      "JSON-file repository path must identify a file rather than a filesystem root."
    );
  }

  if (
    path.extname(
      resolvedPath
    ).toLowerCase() !==
      ".json"
  ) {
    throw new RangeError(
      "JSON-file repository path must use the .json extension."
    );
  }

  return resolvedPath;
}

function normaliseMaxFileBytes(
  value
) {
  if (
    value ===
      undefined
  ) {
    return DEFAULT_JSON_FILE_MAX_BYTES;
  }

  if (
    !Number.isSafeInteger(
      value
    ) ||
    value <
      1_024
  ) {
    throw new RangeError(
      "JSON-file repository maximum size must be a safe integer of at least 1024 bytes."
    );
  }

  return value;
}

function assertFunction(
  value,
  name
) {
  if (
    typeof value !==
      "function"
  ) {
    throw new TypeError(
      `${name} must be a function.`
    );
  }

  return value;
}

function assertEntityId(
  value,
  description =
    "JSON-file repository entity ID"
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      `${description} must be a string.`
    );
  }

  if (
    !ENTITY_ID_PATTERN.test(
      value
    )
  ) {
    throw new RangeError(
      [
        `${description} must begin with a letter or number`,
        "and contain only letters, numbers, periods, underscores,",
        "colons, or hyphens.",
        "The maximum length is 128 characters."
      ].join(" ")
    );
  }

  return value;
}

function assertInternalId(
  value,
  description
) {
  if (
    typeof value !==
      "string" ||
    !INTERNAL_ID_PATTERN.test(
      value
    )
  ) {
    throw new TypeError(
      `${description} contains an invalid identifier.`
    );
  }

  return value;
}

function normaliseTimestamp(
  value,
  description
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new TypeError(
      `${description} must produce a valid date or timestamp.`
    );
  }

  return date.toISOString();
}

function assertCanonicalTimestamp(
  value,
  description
) {
  if (
    typeof value !==
      "string" ||
    !ISO_TIMESTAMP_PATTERN.test(
      value
    ) ||
    new Date(
      value
    ).toISOString() !==
      value
  ) {
    throw new TypeError(
      `${description} must be a canonical ISO 8601 timestamp.`
    );
  }

  return value;
}

function assertExactStringKeys(
  value,
  expectedKeys,
  description
) {
  const ownKeys =
    Reflect.ownKeys(
      value
    );

  if (
    ownKeys.some(
      (key) =>
        typeof key !==
          "string"
    )
  ) {
    throw new TypeError(
      `${description} must not contain symbol fields.`
    );
  }

  const actualKeys =
    [
      ...ownKeys
    ].sort();

  const sortedExpectedKeys =
    [
      ...expectedKeys
    ].sort();

  if (
    actualKeys.length !==
      sortedExpectedKeys.length ||
    !actualKeys.every(
      (
        key,
        index
      ) =>
        key ===
        sortedExpectedKeys[index]
    )
  ) {
    throw new TypeError(
      `${description} contains unsupported or missing fields.`
    );
  }
}

function cloneJsonValue(
  value,
  description,
  {
    depth = 0,
    ancestors = new Set()
  } = {}
) {
  if (
    depth >
    MAX_JSON_DEPTH
  ) {
    throw new RangeError(
      `${description} exceeds the maximum JSON nesting depth of ${MAX_JSON_DEPTH}.`
    );
  }

  if (
    value ===
      null ||
    typeof value ===
      "string" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number"
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      throw new TypeError(
        `${description} must not contain non-finite numbers.`
      );
    }

    return value;
  }

  if (
    typeof value !==
      "object"
  ) {
    throw new TypeError(
      `${description} must contain only JSON-compatible values.`
    );
  }

  if (
    ancestors.has(
      value
    )
  ) {
    throw new TypeError(
      `${description} must not contain circular references.`
    );
  }

  const nextAncestors =
    new Set(
      ancestors
    );

  nextAncestors.add(
    value
  );

  if (
    Array.isArray(
      value
    )
  ) {
    const result =
      [];

    for (
      let index = 0;
      index <
      value.length;
      index += 1
    ) {
      if (
        !Object.hasOwn(
          value,
          index
        )
      ) {
        throw new TypeError(
          `${description} must not contain sparse arrays.`
        );
      }

      result.push(
        cloneJsonValue(
          value[index],
          `${description}[${index}]`,
          {
            depth:
              depth + 1,

            ancestors:
              nextAncestors
          }
        )
      );
    }

    return result;
  }

  if (
    !isPlainObject(
      value
    )
  ) {
    throw new TypeError(
      `${description} must contain only plain objects and arrays.`
    );
  }

  const result =
    {};

  for (
    const key of
    Reflect.ownKeys(
      value
    )
  ) {
    if (
      typeof key !==
        "string"
    ) {
      throw new TypeError(
        `${description} must not contain symbol fields.`
      );
    }

    if (
      DANGEROUS_PROPERTY_NAMES.has(
        key
      )
    ) {
      throw new RangeError(
        `${description} contains an unsafe property name: ${key}.`
      );
    }

    result[key] =
      cloneJsonValue(
        value[key],
        `${description}.${key}`,
        {
          depth:
            depth + 1,

          ancestors:
            nextAncestors
        }
      );
  }

  return result;
}

function cloneJsonObject(
  value,
  description
) {
  assertPlainObject(
    value,
    `${description} must be a plain object.`
  );

  return cloneJsonValue(
    value,
    description
  );
}

function jsonValuesEqual(
  firstValue,
  secondValue
) {
  if (
    Object.is(
      firstValue,
      secondValue
    )
  ) {
    return true;
  }

  if (
    Array.isArray(
      firstValue
    ) ||
    Array.isArray(
      secondValue
    )
  ) {
    if (
      !Array.isArray(
        firstValue
      ) ||
      !Array.isArray(
        secondValue
      ) ||
      firstValue.length !==
        secondValue.length
    ) {
      return false;
    }

    return firstValue.every(
      (
        item,
        index
      ) =>
        jsonValuesEqual(
          item,
          secondValue[index]
        )
    );
  }

  if (
    !isPlainObject(
      firstValue
    ) ||
    !isPlainObject(
      secondValue
    )
  ) {
    return false;
  }

  const firstKeys =
    Object.keys(
      firstValue
    );

  const secondKeys =
    Object.keys(
      secondValue
    );

  if (
    firstKeys.length !==
      secondKeys.length
  ) {
    return false;
  }

  return firstKeys.every(
    (key) =>
      Object.hasOwn(
        secondValue,
        key
      ) &&
      jsonValuesEqual(
        firstValue[key],
        secondValue[key]
      )
  );
}

function recordMatchesQuery(
  record,
  query
) {
  return Object.entries(
    query
  ).every(
    ([
      key,
      expectedValue
    ]) =>
      Object.hasOwn(
        record,
        key
      ) &&
      jsonValuesEqual(
        record[key],
        expectedValue
      )
  );
}

function recordBelongsToContext(
  record,
  context
) {
  return (
    record.ownerId ===
      context.userId &&
    record.userId ===
      context.userId &&
    record.workspaceId ===
      context.workspaceId
  );
}

function createEmptyDocument(
  repositoryName,
  entityName
) {
  return {
    schemaVersion:
      JSON_FILE_REPOSITORY_SCHEMA_VERSION,

    repositoryName,

    entityName,

    records:
      []
  };
}

function validateStoredRecord(
  record
) {
  const clonedRecord =
    cloneJsonObject(
      record,
      "Stored repository record"
    );

  for (
    const fieldName of
    REQUIRED_RECORD_FIELDS
  ) {
    if (
      !Object.hasOwn(
        clonedRecord,
        fieldName
      )
    ) {
      throw new TypeError(
        `Stored repository record is missing required field: ${fieldName}.`
      );
    }
  }

  assertEntityId(
    clonedRecord.id,
    "Stored repository record ID"
  );

  assertInternalId(
    clonedRecord.ownerId,
    "Stored repository owner ID"
  );

  assertInternalId(
    clonedRecord.userId,
    "Stored repository user ID"
  );

  assertInternalId(
    clonedRecord.workspaceId,
    "Stored repository workspace ID"
  );

  if (
    clonedRecord.ownerId !==
      clonedRecord.userId
  ) {
    throw new TypeError(
      "Stored repository owner ID must match its user ID."
    );
  }

  assertCanonicalTimestamp(
    clonedRecord.createdAt,
    "Stored repository creation timestamp"
  );

  assertCanonicalTimestamp(
    clonedRecord.updatedAt,
    "Stored repository update timestamp"
  );

  if (
    new Date(
      clonedRecord.updatedAt
    ).getTime() <
    new Date(
      clonedRecord.createdAt
    ).getTime()
  ) {
    throw new TypeError(
      "Stored repository update timestamp cannot precede its creation timestamp."
    );
  }

  if (
    !Number.isSafeInteger(
      clonedRecord.version
    ) ||
    clonedRecord.version <
      1
  ) {
    throw new TypeError(
      "Stored repository record version must be a positive safe integer."
    );
  }

  return clonedRecord;
}

function validateStoredDocument(
  value,
  repositoryName,
  entityName
) {
  assertPlainObject(
    value,
    "Stored repository document must be a plain object."
  );

  assertExactStringKeys(
    value,
    STORAGE_DOCUMENT_KEYS,
    "Stored repository document"
  );

  if (
    value.schemaVersion !==
      JSON_FILE_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new RangeError(
      [
        "Unsupported JSON-file repository schema version:",
        `${String(value.schemaVersion)}.`
      ].join(" ")
    );
  }

  if (
    value.repositoryName !==
      repositoryName
  ) {
    throw new TypeError(
      "Stored repository name does not match the configured repository."
    );
  }

  if (
    value.entityName !==
      entityName
  ) {
    throw new TypeError(
      "Stored repository entity name does not match the configured repository."
    );
  }

  if (
    !Array.isArray(
      value.records
    )
  ) {
    throw new TypeError(
      "Stored repository records must be an array."
    );
  }

  const records =
    value.records.map(
      validateStoredRecord
    );

  const recordIds =
    new Set();

  for (
    const record of
    records
  ) {
    if (
      recordIds.has(
        record.id
      )
    ) {
      throw new TypeError(
        `Stored repository contains duplicate entity ID: ${record.id}.`
      );
    }

    recordIds.add(
      record.id
    );
  }

  return {
    schemaVersion:
      JSON_FILE_REPOSITORY_SCHEMA_VERSION,

    repositoryName,

    entityName,

    records
  };
}

function parseStoredDocument(
  source,
  repositoryName,
  entityName
) {
  const cleanedSource =
    source.replace(
      /^\uFEFF/u,
      ""
    );

  if (
    cleanedSource.trim() ===
      ""
  ) {
    throw new JsonFileRepositoryError(
      "JSON-file repository storage is empty.",
      {
        code:
          JSON_FILE_REPOSITORY_ERROR_CODES
            .INVALID_STORAGE_DATA
      }
    );
  }

  let parsedValue;

  try {
    parsedValue =
      JSON.parse(
        cleanedSource
      );
  } catch (cause) {
    throw new JsonFileRepositoryError(
      "JSON-file repository storage contains invalid JSON.",
      {
        code:
          JSON_FILE_REPOSITORY_ERROR_CODES
            .INVALID_STORAGE_DATA,

        cause
      }
    );
  }

  try {
    return validateStoredDocument(
      parsedValue,
      repositoryName,
      entityName
    );
  } catch (cause) {
    throw new JsonFileRepositoryError(
      "JSON-file repository storage contains invalid data.",
      {
        code:
          JSON_FILE_REPOSITORY_ERROR_CODES
            .INVALID_STORAGE_DATA,

        cause
      }
    );
  }
}

function createTemporaryFilePath(
  filePath
) {
  const directory =
    path.dirname(
      filePath
    );

  const baseName =
    path.basename(
      filePath
    );

  return path.join(
    directory,
    `.${baseName}.${process.pid}.${randomUUID()}.tmp`
  );
}

async function removeTemporaryFile(
  temporaryFilePath
) {
  try {
    await unlink(
      temporaryFilePath
    );
  } catch (error) {
    if (
      error?.code !==
        "ENOENT"
    ) {
      throw error;
    }
  }
}

async function synchroniseDirectory(
  directoryPath
) {
  let directoryHandle;

  try {
    directoryHandle =
      await open(
        directoryPath,
        "r"
      );

    await directoryHandle.sync();
  } catch (error) {
    if (
      !DIRECTORY_SYNC_IGNORED_ERROR_CODES.has(
        error?.code
      )
    ) {
      throw error;
    }
  } finally {
    await directoryHandle
      ?.close()
      .catch(
        () => {}
      );
  }
}

function createSerialExecutor() {
  let queue =
    Promise.resolve();

  return function executeSerially(
    operation
  ) {
    const result =
      queue.then(
        operation,
        operation
      );

    queue =
      result.then(
        () =>
          undefined,
        () =>
          undefined
      );

    return result;
  };
}

function createFilePathLockKey(
  filePath
) {
  const normalisedPath =
    path.normalize(
      filePath
    );

  return process.platform ===
    "win32"
    ? normalisedPath.toLowerCase()
    : normalisedPath;
}

function getProcessWideSerialExecutor(
  filePath
) {
  const lockKey =
    createFilePathLockKey(
      filePath
    );

  const existingExecutor =
    PROCESS_WIDE_SERIAL_EXECUTORS.get(
      lockKey
    );

  if (
    existingExecutor
  ) {
    return existingExecutor;
  }

  const executor =
    createSerialExecutor();

  PROCESS_WIDE_SERIAL_EXECUTORS.set(
    lockKey,
    executor
  );

  return executor;
}

function createLockFilePath(
  filePath
) {
  return `${filePath}.lock`;
}

function isWindowsFileLockContentionError(
  error
) {
  return (
    process.platform ===
      "win32" &&
    WINDOWS_FILE_LOCK_CONTENTION_ERROR_CODES.has(
      error?.code
    )
  );
}

function isFileLockContentionError(
  error
) {
  return (
    error?.code ===
      "EEXIST" ||
    isWindowsFileLockContentionError(
      error
    )
  );
}

async function removeStaleLockFile(
  lockFilePath
) {
  let lockStatistics;

  try {
    lockStatistics =
      await stat(
        lockFilePath
      );
  } catch (error) {
    if (
      error?.code ===
        "ENOENT"
    ) {
      return true;
    }

    if (
      isWindowsFileLockContentionError(
        error
      )
    ) {
      return false;
    }

    throw error;
  }

  const lockAgeMs =
    Date.now() -
    lockStatistics.mtimeMs;

  if (
    lockAgeMs <
      FILE_LOCK_STALE_AFTER_MS
  ) {
    return false;
  }

  try {
    await unlink(
      lockFilePath
    );

    return true;
  } catch (error) {
    if (
      error?.code ===
        "ENOENT"
    ) {
      return true;
    }

    if (
      error?.code ===
        "EPERM" ||
      error?.code ===
        "EACCES" ||
      error?.code ===
        "EBUSY"
    ) {
      return false;
    }

    throw error;
  }
}

async function acquireRepositoryFileLock(
  filePath
) {
  const directoryPath =
    path.dirname(
      filePath
    );

  const lockFilePath =
    createLockFilePath(
      filePath
    );

  const startedAt =
    Date.now();

  await mkdir(
    directoryPath,
    {
      recursive:
        true,

      mode:
        0o700
    }
  );

  while (
    true
  ) {
    let lockFileHandle;

    try {
      lockFileHandle =
        await open(
          lockFilePath,
          "wx",
          0o600
        );

      await lockFileHandle.writeFile(
        [
          `pid=${process.pid}`,
          `createdAt=${new Date().toISOString()}`,
          ""
        ].join("\n"),
        {
          encoding:
            "utf8"
        }
      );

      await lockFileHandle.sync();

      let released =
        false;

      return async function releaseRepositoryFileLock() {
        if (
          released
        ) {
          return;
        }

        released =
          true;

        await lockFileHandle.close();

        try {
          await unlink(
            lockFilePath
          );
        } catch (error) {
          if (
            error?.code !==
              "ENOENT"
          ) {
            throw error;
          }
        }
      };
    } catch (error) {
      const createdLockFile =
        lockFileHandle !==
          undefined;

      await lockFileHandle
        ?.close()
        .catch(
          () => {}
        );

      if (
        createdLockFile
      ) {
        await unlink(
          lockFilePath
        ).catch(
          () => {}
        );
      }

      if (
        !isFileLockContentionError(
          error
        )
      ) {
        throw error;
      }

      const staleLockRemoved =
        await removeStaleLockFile(
          lockFilePath
        );

      if (
        Date.now() -
          startedAt >=
        FILE_LOCK_MAX_WAIT_MS
      ) {
        const timeoutError =
          new Error(
            "Timed out waiting for the JSON-file repository lock."
          );

        timeoutError.code =
          "JSON_FILE_REPOSITORY_LOCK_TIMEOUT";

        throw timeoutError;
      }

      if (
        !staleLockRemoved
      ) {
        await delay(
          FILE_LOCK_RETRY_DELAY_MS
        );
      }
    }
  }
}

function attachLockReleaseFailure(
  primaryError,
  releaseError
) {
  if (
    !primaryError ||
    (
      typeof primaryError !==
        "object" &&
      typeof primaryError !==
        "function"
    )
  ) {
    return;
  }

  try {
    Object.defineProperty(
      primaryError,
      "repositoryLockReleaseError",
      {
        value:
          releaseError,

        enumerable:
          false,

        configurable:
          true,

        writable:
          false
      }
    );
  } catch {
    // Preserve the primary error when it cannot be extended.
  }
}

export function createJsonFileRepository(
  options
) {
  assertPlainObject(
    options,
    "JSON-file repository options must be a plain object."
  );

  assertSupportedOptionKeys(
    options
  );

  const filePath =
    normaliseFilePath(
      options.filePath
    );

  const maxFileBytes =
    normaliseMaxFileBytes(
      options.maxFileBytes
    );

  const idFactory =
    assertFunction(
      Object.hasOwn(
        options,
        "idFactory"
      )
        ? options.idFactory
        : randomUUID,
      "JSON-file repository ID factory"
    );

  const clock =
    assertFunction(
      Object.hasOwn(
        options,
        "clock"
      )
        ? options.clock
        : () =>
            new Date(),
      "JSON-file repository clock"
    );

  const executeSerially =
    getProcessWideSerialExecutor(
      filePath
    );

  function executeMutation(
    operation
  ) {
    return executeSerially(
      async () => {
        let releaseLock;

        try {
          releaseLock =
            await acquireRepositoryFileLock(
              filePath
            );
        } catch (cause) {
          throw new JsonFileRepositoryError(
            "Unable to acquire the JSON-file repository lock.",
            {
              code:
                JSON_FILE_REPOSITORY_ERROR_CODES
                  .STORAGE_WRITE_FAILED,

              cause
            }
          );
        }

        let result;
        let primaryError;
        let operationFailed =
          false;

        try {
          result =
            await operation();
        } catch (error) {
          operationFailed =
            true;

          primaryError =
            error;
        }

        try {
          await releaseLock();
        } catch (cause) {
          if (
            operationFailed
          ) {
            attachLockReleaseFailure(
              primaryError,
              cause
            );
          } else {
            throw new JsonFileRepositoryError(
              "Unable to release the JSON-file repository lock.",
              {
                code:
                  JSON_FILE_REPOSITORY_ERROR_CODES
                    .STORAGE_WRITE_FAILED,

                cause
              }
            );
          }
        }

        if (
          operationFailed
        ) {
          throw primaryError;
        }

        return result;
      }
    );
  }

  async function readDocument(
    repositoryName,
    entityName
  ) {
    let fileHandle;

    try {
      fileHandle =
        await open(
          filePath,
          "r"
        );

      const statistics =
        await fileHandle.stat();

      if (
        statistics.size >
          maxFileBytes
      ) {
        throw new JsonFileRepositoryError(
          "JSON-file repository storage exceeds its configured size limit.",
          {
            code:
              JSON_FILE_REPOSITORY_ERROR_CODES
                .STORAGE_LIMIT_EXCEEDED
          }
        );
      }

      const source =
        await fileHandle.readFile({
          encoding:
            "utf8"
        });

      return parseStoredDocument(
        source,
        repositoryName,
        entityName
      );
    } catch (error) {
      if (
        error?.code ===
          "ENOENT"
      ) {
        return createEmptyDocument(
          repositoryName,
          entityName
        );
      }

      if (
        error instanceof
          JsonFileRepositoryError
      ) {
        throw error;
      }

      throw new JsonFileRepositoryError(
        "Unable to read JSON-file repository storage.",
        {
          code:
            JSON_FILE_REPOSITORY_ERROR_CODES
              .STORAGE_READ_FAILED,

          cause:
            error
        }
      );
    } finally {
      await fileHandle
        ?.close()
        .catch(
          () => {}
        );
    }
  }

  async function writeDocument(
    document,
    repositoryName,
    entityName
  ) {
    const validatedDocument =
      validateStoredDocument(
        document,
        repositoryName,
        entityName
      );

    const serializedDocument =
      `${JSON.stringify(
        validatedDocument,
        null,
        2
      )}\n`;

    if (
      Buffer.byteLength(
        serializedDocument,
        "utf8"
      ) >
      maxFileBytes
    ) {
      throw new JsonFileRepositoryError(
        "JSON-file repository write exceeds its configured size limit.",
        {
          code:
            JSON_FILE_REPOSITORY_ERROR_CODES
              .STORAGE_LIMIT_EXCEEDED
        }
      );
    }

    const directoryPath =
      path.dirname(
        filePath
      );

    const temporaryFilePath =
      createTemporaryFilePath(
        filePath
      );

    let temporaryFileHandle;

    try {
      await mkdir(
        directoryPath,
        {
          recursive:
            true,

          mode:
            0o700
        }
      );

      temporaryFileHandle =
        await open(
          temporaryFilePath,
          "wx",
          0o600
        );

      await temporaryFileHandle.writeFile(
        serializedDocument,
        {
          encoding:
            "utf8"
        }
      );

      await temporaryFileHandle.sync();
      await temporaryFileHandle.close();

      temporaryFileHandle =
        null;

      await rename(
        temporaryFilePath,
        filePath
      );

      await chmod(
        filePath,
        0o600
      );

      await synchroniseDirectory(
        directoryPath
      );
    } catch (error) {
      await temporaryFileHandle
        ?.close()
        .catch(
          () => {}
        );

      await removeTemporaryFile(
        temporaryFilePath
      ).catch(
        () => {}
      );

      if (
        error instanceof
          JsonFileRepositoryError
      ) {
        throw error;
      }

      throw new JsonFileRepositoryError(
        "Unable to write JSON-file repository storage.",
        {
          code:
            JSON_FILE_REPOSITORY_ERROR_CODES
              .STORAGE_WRITE_FAILED,

          cause:
            error
        }
      );
    }
  }

  function getCurrentTimestamp() {
    return normaliseTimestamp(
      clock(),
      "JSON-file repository clock"
    );
  }

  function generateUniqueEntityId(
    records
  ) {
    const existingIds =
      new Set(
        records.map(
          (record) =>
            record.id
        )
      );

    for (
      let attempt = 0;
      attempt <
      MAX_ID_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const entityId =
        assertEntityId(
          idFactory()
        );

      if (
        !existingIds.has(
          entityId
        )
      ) {
        return entityId;
      }
    }

    throw new JsonFileRepositoryError(
      "Unable to generate a unique repository entity ID.",
      {
        code:
          JSON_FILE_REPOSITORY_ERROR_CODES
            .ID_GENERATION_FAILED
      }
    );
  }

  const repository =
    createRepository({
      name:
        options.name,

      entityName:
        options.entityName,

      async findById(
        context,
        entityId
      ) {
        return executeSerially(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            const record =
              document.records.find(
                (candidate) =>
                  candidate.id ===
                    entityId &&
                  recordBelongsToContext(
                    candidate,
                    context
                  )
              );

            return record
              ? cloneJsonObject(
                  record,
                  "Repository record"
                )
              : null;
          }
        );
      },

      async list(
        context,
        query
      ) {
        const safeQuery =
          cloneJsonObject(
            query,
            "Repository query"
          );

        return executeSerially(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            return document.records
              .filter(
                (record) =>
                  recordBelongsToContext(
                    record,
                    context
                  ) &&
                  recordMatchesQuery(
                    record,
                    safeQuery
                  )
              )
              .map(
                (record) =>
                  cloneJsonObject(
                    record,
                    "Repository record"
                  )
              );
          }
        );
      },

      async create(
        context,
        input
      ) {
        const safeInput =
          cloneJsonObject(
            input,
            "Repository create input"
          );

        return executeMutation(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            const timestamp =
              getCurrentTimestamp();

            const record = {
              id:
                generateUniqueEntityId(
                  document.records
                ),

              ownerId:
                context.userId,

              userId:
                context.userId,

              workspaceId:
                context.workspaceId,

              createdAt:
                timestamp,

              updatedAt:
                timestamp,

              version:
                1,

              ...safeInput
            };

            document.records.push(
              record
            );

            await writeDocument(
              document,
              repository.name,
              repository.entityName
            );

            return cloneJsonObject(
              record,
              "Repository record"
            );
          }
        );
      },

      async update(
        context,
        entityId,
        changes
      ) {
        const safeChanges =
          cloneJsonObject(
            changes,
            "Repository update input"
          );

        return executeMutation(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            const recordIndex =
              document.records.findIndex(
                (record) =>
                  record.id ===
                    entityId &&
                  recordBelongsToContext(
                    record,
                    context
                  )
              );

            if (
              recordIndex ===
                -1
            ) {
              return null;
            }

            const existingRecord =
              document.records[
                recordIndex
              ];

            const updatedTimestamp =
              getCurrentTimestamp();

            if (
              new Date(
                updatedTimestamp
              ).getTime() <
              new Date(
                existingRecord.createdAt
              ).getTime()
            ) {
              throw new TypeError(
                "JSON-file repository clock cannot move before the record creation time."
              );
            }

            const updatedRecord = {
              ...existingRecord,
              ...safeChanges,

              updatedAt:
                updatedTimestamp,

              version:
                existingRecord.version +
                1
            };

            document.records[
              recordIndex
            ] =
              updatedRecord;

            await writeDocument(
              document,
              repository.name,
              repository.entityName
            );

            return cloneJsonObject(
              updatedRecord,
              "Repository record"
            );
          }
        );
      },

      async delete(
        context,
        entityId
      ) {
        return executeMutation(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            const recordIndex =
              document.records.findIndex(
                (record) =>
                  record.id ===
                    entityId &&
                  recordBelongsToContext(
                    record,
                    context
                  )
              );

            if (
              recordIndex ===
                -1
            ) {
              return false;
            }

            document.records.splice(
              recordIndex,
              1
            );

            await writeDocument(
              document,
              repository.name,
              repository.entityName
            );

            return true;
          }
        );
      },

      async count(
        context,
        query
      ) {
        const safeQuery =
          cloneJsonObject(
            query,
            "Repository query"
          );

        return executeSerially(
          async () => {
            const document =
              await readDocument(
                repository.name,
                repository.entityName
              );

            return document.records.filter(
              (record) =>
                recordBelongsToContext(
                  record,
                  context
                ) &&
                recordMatchesQuery(
                  record,
                  safeQuery
                )
            ).length;
          }
        );
      }
    });

  return repository;
}