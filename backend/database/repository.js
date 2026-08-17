import {
  assertIdentityContext
} from "../services/identity/identity-provider.js";

const REPOSITORY_NAME_PATTERN =
  /^[a-z][A-Za-z0-9]{0,63}$/u;

const ENTITY_NAME_PATTERN =
  /^[a-z][a-z0-9-]{0,63}$/u;

const ENTITY_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001F\u007F]/u;

const MAX_REQUEST_ID_LENGTH =
  255;

export const REPOSITORY_CONTEXT_SCHEMA_VERSION =
  1;

export const REPOSITORY_OPERATION_NAMES =
  Object.freeze([
    "findById",
    "list",
    "create",
    "update",
    "delete",
    "count"
  ]);

export const RESERVED_RECORD_FIELDS =
  Object.freeze([
    "id",
    "ownerId",
    "userId",
    "workspaceId",
    "createdAt",
    "updatedAt",
    "version"
  ]);

const REPOSITORY_CONTEXT_KEYS =
  Object.freeze([
    "schemaVersion",
    "identity",
    "userId",
    "workspaceId",
    "requestId"
  ]);

const REPOSITORY_KEYS =
  Object.freeze([
    "name",
    "entityName",
    ...REPOSITORY_OPERATION_NAMES
  ]);

const REPOSITORY_OPTION_KEYS =
  new Set(
    REPOSITORY_KEYS
  );

const REPOSITORY_CONTEXT_OPTION_KEYS =
  new Set([
    "requestId"
  ]);

const RESERVED_RECORD_FIELD_SET =
  new Set(
    RESERVED_RECORD_FIELDS
  );

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

function assertSupportedOwnKeys(
  value,
  supportedKeys,
  messagePrefix
) {
  const unsupportedKeys =
    Reflect.ownKeys(
      value
    ).filter(
      (key) =>
        typeof key !==
          "string" ||
        !supportedKeys.has(
          key
        )
    );

  if (
    unsupportedKeys.length >
    0
  ) {
    throw new RangeError(
      [
        messagePrefix,
        `${unsupportedKeys.map(String).join(", ")}.`
      ].join(" ")
    );
  }
}

function normaliseRepositoryName(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Repository name must be a string."
    );
  }

  const name =
    value.trim();

  if (
    !REPOSITORY_NAME_PATTERN.test(
      name
    )
  ) {
    throw new RangeError(
      [
        "Repository name must start with a lowercase letter",
        "and contain only letters or numbers.",
        "The maximum length is 64 characters."
      ].join(" ")
    );
  }

  return name;
}

function normaliseEntityName(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Repository entity name must be a string."
    );
  }

  const entityName =
    value.trim();

  if (
    !ENTITY_NAME_PATTERN.test(
      entityName
    )
  ) {
    throw new RangeError(
      [
        "Repository entity name must start with a lowercase letter",
        "and contain only lowercase letters, numbers, or hyphens.",
        "The maximum length is 64 characters."
      ].join(" ")
    );
  }

  return entityName;
}

function normaliseEntityId(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Repository entity ID must be a string."
    );
  }

  const entityId =
    value.trim();

  if (
    !ENTITY_ID_PATTERN.test(
      entityId
    )
  ) {
    throw new RangeError(
      [
        "Repository entity ID must begin with a letter or number",
        "and contain only letters, numbers, periods, underscores,",
        "colons, or hyphens.",
        "The maximum length is 128 characters."
      ].join(" ")
    );
  }

  return entityId;
}

function normaliseRequestId(
  value
) {
  if (
    value === undefined ||
    value === null ||
    (
      typeof value ===
        "string" &&
      value.trim() ===
        ""
    )
  ) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Repository request ID must be a string or null."
    );
  }

  const requestId =
    value.trim();

  if (
    requestId.length >
      MAX_REQUEST_ID_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(
      requestId
    )
  ) {
    throw new RangeError(
      [
        "Repository request ID must not exceed",
        `${MAX_REQUEST_ID_LENGTH} characters or contain control characters.`
      ].join(" ")
    );
  }

  return requestId;
}

function haveSameKeys(
  value,
  expectedKeys
) {
  const actualKeys =
    Object.keys(
      value
    ).sort();

  const sortedExpectedKeys =
    [
      ...expectedKeys
    ].sort();

  if (
    actualKeys.length !==
    sortedExpectedKeys.length
  ) {
    return false;
  }

  return actualKeys.every(
    (
      key,
      index
    ) =>
      key ===
      sortedExpectedKeys[index]
  );
}

function createOperationInput(
  value,
  description,
  {
    allowEmpty = false
  } = {}
) {
  assertPlainObject(
    value,
    `${description} must be a plain object.`
  );

  const ownKeys =
    Reflect.ownKeys(
      value
    );

  const symbolKeys =
    ownKeys.filter(
      (key) =>
        typeof key ===
        "symbol"
    );

  if (
    symbolKeys.length >
    0
  ) {
    throw new RangeError(
      `${description} must not contain symbol fields.`
    );
  }

  const keys =
    ownKeys.filter(
      (key) =>
        typeof key ===
        "string"
    );

  if (
    !allowEmpty &&
    keys.length ===
      0
  ) {
    throw new RangeError(
      `${description} must contain at least one field.`
    );
  }

  const reservedFields =
    keys.filter(
      (key) =>
        RESERVED_RECORD_FIELD_SET.has(
          key
        )
    );

  if (
    reservedFields.length >
    0
  ) {
    throw new RangeError(
      [
        `${description} cannot assign system-managed fields:`,
        `${reservedFields.join(", ")}.`
      ].join(" ")
    );
  }

  return Object.freeze({
    ...value
  });
}

function createQueryInput(
  value
) {
  return createOperationInput(
    value,
    "Repository query",
    {
      allowEmpty:
        true
    }
  );
}

function assertRecordResult(
  value,
  operationName,
  {
    allowNull = false
  } = {}
) {
  if (
    allowNull &&
    value === null
  ) {
    return value;
  }

  if (
    !isPlainObject(
      value
    )
  ) {
    const expectedResult =
      allowNull
        ? "a plain record object or null."
        : "a plain record object.";

    throw new TypeError(
      [
        `Repository operation "${operationName}"`,
        `must return ${expectedResult}`
      ].join(" ")
    );
  }

  return value;
}

function assertListResult(
  value
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new TypeError(
      'Repository operation "list" must return an array.'
    );
  }

  for (
    const record of
    value
  ) {
    assertRecordResult(
      record,
      "list"
    );
  }

  return value;
}

function assertDeleteResult(
  value
) {
  if (
    typeof value !==
      "boolean"
  ) {
    throw new TypeError(
      'Repository operation "delete" must return a boolean.'
    );
  }

  return value;
}

function assertCountResult(
  value
) {
  if (
    !Number.isSafeInteger(
      value
    ) ||
    value <
      0
  ) {
    throw new TypeError(
      [
        'Repository operation "count" must return',
        "a non-negative safe integer."
      ].join(" ")
    );
  }

  return value;
}

function assertOperationFunction(
  options,
  operationName
) {
  const operation =
    options[
      operationName
    ];

  if (
    typeof operation !==
      "function"
  ) {
    throw new TypeError(
      `Repository must define a ${operationName} function.`
    );
  }

  return operation;
}

export function createRepositoryContext(
  identity,
  options = {}
) {
  const validatedIdentity =
    assertIdentityContext(
      identity
    );

  assertPlainObject(
    options,
    "Repository context options must be a plain object."
  );

  assertSupportedOwnKeys(
    options,
    REPOSITORY_CONTEXT_OPTION_KEYS,
    "Repository context options contain unsupported fields:"
  );

  return Object.freeze({
    schemaVersion:
      REPOSITORY_CONTEXT_SCHEMA_VERSION,

    identity:
      validatedIdentity,

    userId:
      validatedIdentity.userId,

    workspaceId:
      validatedIdentity.workspaceId,

    requestId:
      normaliseRequestId(
        options.requestId
      )
  });
}

export function assertRepositoryContext(
  context
) {
  assertPlainObject(
    context,
    "A valid repository context is required."
  );

  if (
    !haveSameKeys(
      context,
      REPOSITORY_CONTEXT_KEYS
    )
  ) {
    throw new TypeError(
      "Repository context contains an unsupported or missing field."
    );
  }

  if (
    context.schemaVersion !==
      REPOSITORY_CONTEXT_SCHEMA_VERSION
  ) {
    throw new RangeError(
      [
        "Unsupported repository context schema version:",
        `${String(context.schemaVersion)}.`
      ].join(" ")
    );
  }

  const identity =
    assertIdentityContext(
      context.identity
    );

  if (
    context.userId !==
      identity.userId ||
    context.workspaceId !==
      identity.workspaceId
  ) {
    throw new TypeError(
      "Repository context ownership does not match its identity."
    );
  }

  normaliseRequestId(
    context.requestId
  );

  return context;
}

export function isRepositoryContext(
  value
) {
  try {
    assertRepositoryContext(
      value
    );

    return true;
  } catch {
    return false;
  }
}

export function createRepository(
  options
) {
  assertPlainObject(
    options,
    "Repository options must be a plain object."
  );

  assertSupportedOwnKeys(
    options,
    REPOSITORY_OPTION_KEYS,
    "Repository options contain unsupported fields:"
  );

  const name =
    normaliseRepositoryName(
      options.name
    );

  const entityName =
    normaliseEntityName(
      options.entityName
    );

  const operations =
    Object.fromEntries(
      REPOSITORY_OPERATION_NAMES.map(
        (operationName) => [
          operationName,
          assertOperationFunction(
            options,
            operationName
          )
        ]
      )
    );

  const repository = {
    name,

    entityName,

    async findById(
      context,
      entityId
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedEntityId =
        normaliseEntityId(
          entityId
        );

      const result =
        await operations.findById(
          validatedContext,
          validatedEntityId
        );

      return assertRecordResult(
        result,
        "findById",
        {
          allowNull:
            true
        }
      );
    },

    async list(
      context,
      query = {}
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedQuery =
        createQueryInput(
          query
        );

      const result =
        await operations.list(
          validatedContext,
          validatedQuery
        );

      return assertListResult(
        result
      );
    },

    async create(
      context,
      input
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedInput =
        createOperationInput(
          input,
          "Repository create input"
        );

      const result =
        await operations.create(
          validatedContext,
          validatedInput
        );

      return assertRecordResult(
        result,
        "create"
      );
    },

    async update(
      context,
      entityId,
      changes
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedEntityId =
        normaliseEntityId(
          entityId
        );

      const validatedChanges =
        createOperationInput(
          changes,
          "Repository update input"
        );

      const result =
        await operations.update(
          validatedContext,
          validatedEntityId,
          validatedChanges
        );

      return assertRecordResult(
        result,
        "update",
        {
          allowNull:
            true
        }
      );
    },

    async delete(
      context,
      entityId
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedEntityId =
        normaliseEntityId(
          entityId
        );

      const result =
        await operations.delete(
          validatedContext,
          validatedEntityId
        );

      return assertDeleteResult(
        result
      );
    },

    async count(
      context,
      query = {}
    ) {
      const validatedContext =
        assertRepositoryContext(
          context
        );

      const validatedQuery =
        createQueryInput(
          query
        );

      const result =
        await operations.count(
          validatedContext,
          validatedQuery
        );

      return assertCountResult(
        result
      );
    }
  };

  return Object.freeze(
    repository
  );
}

export function assertRepository(
  repository
) {
  assertPlainObject(
    repository,
    "A valid repository is required."
  );

  if (
    !haveSameKeys(
      repository,
      REPOSITORY_KEYS
    )
  ) {
    throw new TypeError(
      "Repository contains an unsupported or missing field."
    );
  }

  const name =
    normaliseRepositoryName(
      repository.name
    );

  const entityName =
    normaliseEntityName(
      repository.entityName
    );

  if (
    repository.name !==
      name ||
    repository.entityName !==
      entityName
  ) {
    throw new TypeError(
      "Repository metadata must already be normalised."
    );
  }

  for (
    const operationName of
    REPOSITORY_OPERATION_NAMES
  ) {
    if (
      typeof repository[
        operationName
      ] !==
        "function"
    ) {
      throw new TypeError(
        `Repository must expose a ${operationName} function.`
      );
    }
  }

  return repository;
}

export function isRepository(
  value
) {
  try {
    assertRepository(
      value
    );

    return true;
  } catch {
    return false;
  }
}