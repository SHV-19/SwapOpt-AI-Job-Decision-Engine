import {
  assertPersonalRepositoryRegistry
} from "../database/personal-repositories.js";

import {
  loadCareerEvidenceProfile
} from "./career-evidence-profile-adapter.js";

export function createCareerEvidenceDataSource({
  repositoryRegistry,
  profileService =
    null
} = {}) {
  const registry =
    assertPersonalRepositoryRegistry(
      repositoryRegistry
    );

  assertOptionalProfileService(
    profileService
  );

  const repositories =
    Object.freeze({
      claims:
        registry.getRepository(
          "careerEvidenceClaims"
        ),

      skills:
        registry.getRepository(
          "skills"
        ),

      projects:
        registry.getRepository(
          "projectLibrary"
        ),

      snapshots:
        registry.getRepository(
          "marketJobSnapshots"
        ),

      jobs:
        registry.getRepository(
          "jobs"
        ),

      applications:
        registry.getRepository(
          "applications"
        ),

      decisions:
        registry.getRepository(
          "jobDecisions"
        ),

      baseResumes:
        registry.getRepository(
          "baseResumes"
        ),

      applicationResumeVersions:
        registry.getRepository(
          "applicationResumeVersions"
        )
    });

  async function load(
    context,
    query
  ) {
    const [
      claims,
      skills,
      projects,
      snapshots,
      jobs,
      applications,
      decisions,
      baseResumes,
      applicationResumeVersions,
      profile
    ] =
      await Promise.all([
        repositories.claims.list(
          context
        ),

        repositories.skills.list(
          context
        ),

        repositories.projects.list(
          context
        ),

        query.includeObserved
          ? repositories
              .snapshots
              .list(
                context
              )
          : Promise.resolve(
              []
            ),

        query.includeObserved
          ? repositories
              .jobs
              .list(
                context
              )
          : Promise.resolve(
              []
            ),

        repositories
          .applications
          .list(
            context
          ),

        query.includeObserved
          ? repositories
              .decisions
              .list(
                context
              )
          : Promise.resolve(
              []
            ),

        repositories
          .baseResumes
          .list(
            context
          ),

        repositories
          .applicationResumeVersions
          .list(
            context
          ),

        loadCareerEvidenceProfile(
          profileService
        )
      ]);

    return Object.freeze({
      claims,
      skills,
      projects,
      snapshots,
      jobs,
      applications,
      decisions,
      baseResumes,
      applicationResumeVersions,
      profile
    });
  }

  return Object.freeze({
    repositories,
    load
  });
}

function assertOptionalProfileService(
  service
) {
  if (
    service ===
      null ||
    service ===
      undefined
  ) {
    return null;
  }

  if (
    typeof service
      ?.getApplicationAnswersProfile !==
      "function"
  ) {
    throw new TypeError(
      "Career evidence service requires a valid profile service when configured."
    );
  }

  return service;
}
