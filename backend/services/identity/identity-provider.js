const PROVIDER_ID_PATTERN =
  /^[a-z][a-z0-9-]{0,63}$/u;

const INTERNAL_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const INVALID_SUBJECT_CHARACTER_PATTERN =
  /[\u0000-\u001F\u007F\s]/u;

const MAX_SUBJECT_ID_LENGTH =
  255;

export const IDENTITY_CONTEXT_SCHEMA_VERSION =
  1;

export const IDENTITY_KINDS =
  Object.freeze({
    LOCAL:
      "local",

    AUTHENTICATED:
      "authenticated"
  });

export const SUPPORTED_IDENTITY_KINDS =
  Object.freeze(
    Object.values(
      IDENTITY_KINDS
    )
  );

const SUPPORTED_IDENTITY_KIND_SET =
  new Set(
    SUPPORTED_IDENTITY_KINDS
  );

const IDENTITY_CONTEXT_KEYS =
  Object.freeze([
    "schemaVersion",
    "kind",
    "providerId",
    "subjectId",
    "userId",
    "workspaceId",
    "authenticated"
  ]);

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

function assertRecord(
  value,
  message
) {
  if (
    !isRecord(
      value
    )
  ) {
    throw new TypeError(
      message
    );
  }
}

function normaliseProviderId(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Identity provider ID must be a string."
    );
  }

  const providerId =
    value.trim();

  if (
    !PROVIDER_ID_PATTERN.test(
      providerId
    )
  ) {
    throw new RangeError(
      [
        "Identity provider ID must start with a lowercase letter",
        "and contain only lowercase letters, numbers, or hyphens.",
        "The maximum length is 64 characters."
      ].join(" ")
    );
  }

  return providerId;
}

function normaliseInternalId(
  value,
  fieldName
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      `${fieldName} must be a string.`
    );
  }

  const identifier =
    value.trim();

  if (
    !INTERNAL_ID_PATTERN.test(
      identifier
    )
  ) {
    throw new RangeError(
      [
        `${fieldName} must begin with a letter or number`,
        "and contain only letters, numbers, periods, underscores,",
        "colons, or hyphens.",
        "The maximum length is 128 characters."
      ].join(" ")
    );
  }

  return identifier;
}

function normaliseSubjectId(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Identity subject ID must be a string."
    );
  }

  const subjectId =
    value.trim();

  if (
    subjectId.length ===
      0 ||
    subjectId.length >
      MAX_SUBJECT_ID_LENGTH ||
    INVALID_SUBJECT_CHARACTER_PATTERN.test(
      subjectId
    )
  ) {
    throw new RangeError(
      [
        "Identity subject ID must contain between 1 and",
        `${MAX_SUBJECT_ID_LENGTH} non-whitespace characters`,
        "and must not contain control characters."
      ].join(" ")
    );
  }

  return subjectId;
}

function normaliseIdentityKind(
  value
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Identity kind must be a string."
    );
  }

  const kind =
    value.trim()
      .toLowerCase();

  if (
    !SUPPORTED_IDENTITY_KIND_SET.has(
      kind
    )
  ) {
    throw new RangeError(
      [
        "Identity kind must be one of:",
        `${SUPPORTED_IDENTITY_KINDS.join(", ")}.`
      ].join(" ")
    );
  }

  return kind;
}

function assertResolutionContext(
  resolutionContext
) {
  if (
    !isRecord(
      resolutionContext
    )
  ) {
    throw new TypeError(
      "Identity resolution context must be an object."
    );
  }
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

export function createIdentityContext(
  input
) {
  assertRecord(
    input,
    "Identity context input must be an object."
  );

  const kind =
    normaliseIdentityKind(
      input.kind
    );

  const identity =
    {
      schemaVersion:
        IDENTITY_CONTEXT_SCHEMA_VERSION,

      kind,

      providerId:
        normaliseProviderId(
          input.providerId
        ),

      subjectId:
        normaliseSubjectId(
          input.subjectId
        ),

      userId:
        normaliseInternalId(
          input.userId,
          "Identity user ID"
        ),

      workspaceId:
        normaliseInternalId(
          input.workspaceId,
          "Identity workspace ID"
        ),

      authenticated:
        kind ===
        IDENTITY_KINDS.AUTHENTICATED
    };

  return Object.freeze(
    identity
  );
}

export function assertIdentityContext(
  identity
) {
  assertRecord(
    identity,
    "A valid identity context is required."
  );

  if (
    !haveSameKeys(
      identity,
      IDENTITY_CONTEXT_KEYS
    )
  ) {
    throw new TypeError(
      "Identity context contains an unsupported or missing field."
    );
  }

  if (
    identity.schemaVersion !==
    IDENTITY_CONTEXT_SCHEMA_VERSION
  ) {
    throw new RangeError(
      [
        "Unsupported identity context schema version:",
        `${String(identity.schemaVersion)}.`
      ].join(" ")
    );
  }

  const canonicalIdentity =
    createIdentityContext({
      kind:
        identity.kind,

      providerId:
        identity.providerId,

      subjectId:
        identity.subjectId,

      userId:
        identity.userId,

      workspaceId:
        identity.workspaceId
    });

  if (
    identity.authenticated !==
    canonicalIdentity.authenticated
  ) {
    throw new TypeError(
      "Identity authentication state is inconsistent with its kind."
    );
  }

  return identity;
}

export function isIdentityContext(
  value
) {
  try {
    assertIdentityContext(
      value
    );

    return true;
  } catch {
    return false;
  }
}

export function createIdentityProvider(
  options
) {
  assertRecord(
    options,
    "Identity provider options must be an object."
  );

  const providerId =
    normaliseProviderId(
      options.providerId
    );

  const kind =
    normaliseIdentityKind(
      options.kind
    );

  const resolver =
    options.resolveIdentity;

  if (
    typeof resolver !==
      "function"
  ) {
    throw new TypeError(
      "Identity provider must define a resolveIdentity function."
    );
  }

  const provider =
    {
      providerId,

      kind,

      async resolveIdentity(
        resolutionContext = {}
      ) {
        assertResolutionContext(
          resolutionContext
        );

        const resolvedIdentity =
          await resolver(
            resolutionContext
          );

        assertRecord(
          resolvedIdentity,
          [
            `Identity provider "${providerId}"`,
            "must return an identity object."
          ].join(" ")
        );

        return createIdentityContext({
          providerId,
          kind,

          subjectId:
            resolvedIdentity.subjectId,

          userId:
            resolvedIdentity.userId,

          workspaceId:
            resolvedIdentity.workspaceId
        });
      }
    };

  return Object.freeze(
    provider
  );
}

export function assertIdentityProvider(
  provider
) {
  assertRecord(
    provider,
    "A valid identity provider is required."
  );

  const providerId =
    normaliseProviderId(
      provider.providerId
    );

  const kind =
    normaliseIdentityKind(
      provider.kind
    );

  if (
    provider.providerId !==
    providerId
  ) {
    throw new TypeError(
      "Identity provider ID must already be normalised."
    );
  }

  if (
    provider.kind !==
    kind
  ) {
    throw new TypeError(
      "Identity provider kind must already be normalised."
    );
  }

  if (
    typeof provider.resolveIdentity !==
      "function"
  ) {
    throw new TypeError(
      "Identity provider must expose a resolveIdentity function."
    );
  }

  return provider;
}

export function isIdentityProvider(
  value
) {
  try {
    assertIdentityProvider(
      value
    );

    return true;
  } catch {
    return false;
  }
}

export async function resolveIdentity(
  provider,
  resolutionContext = {}
) {
  const validatedProvider =
    assertIdentityProvider(
      provider
    );

  assertResolutionContext(
    resolutionContext
  );

  const identity =
    await validatedProvider
      .resolveIdentity(
        resolutionContext
      );

  assertIdentityContext(
    identity
  );

  if (
    identity.providerId !==
    validatedProvider.providerId
  ) {
    throw new Error(
      "Resolved identity does not belong to the selected provider."
    );
  }

  if (
    identity.kind !==
    validatedProvider.kind
  ) {
    throw new Error(
      "Resolved identity kind does not match the selected provider."
    );
  }

  return createIdentityContext({
    providerId:
      identity.providerId,

    kind:
      identity.kind,

    subjectId:
      identity.subjectId,

    userId:
      identity.userId,

    workspaceId:
      identity.workspaceId
  });
}