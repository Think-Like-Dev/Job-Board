import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { ApplicationSchema } from '@modules/applications/application.schema';
import { CandidateProfileVersionSchema } from '@modules/candidates/candidate-profile-version.schema';
import type { ProfileSnapshotData, ProfileView } from './profile.types';

/**
 * Creates the immutable JSONB snapshot used by applications that were still
 * pointing at live profile data. Snapshots are only created when a live
 * application actually needs protecting, which keeps growth tied to profile
 * updates rather than every application.
 */
@Injectable()
export class ProfileSnapshotService {
  buildSnapshot(view: ProfileView): ProfileSnapshotData {
    return {
      ...view,
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      documentFileIds: [
        view.profileImage?.id,
        view.resume?.id,
        view.coverLetter?.id,
        ...view.certifications.map((certification) => certification.fileId),
      ].filter((id): id is string => Boolean(id)),
    };
  }

  async createAndRepoint(
    em: EntityManager,
    candidateId: string,
    view: ProfileView,
    excludeApplicationId?: string,
  ): Promise<{ id: string; versionNumber: number } | null> {
    const liveWhere = {
      candidateId,
      profileVersionId: null,
      ...(excludeApplicationId ? { id: { $ne: excludeApplicationId } } : {}),
    };
    const liveCount = await em.count(ApplicationSchema, liveWhere);
    if (liveCount === 0) {
      return null;
    }

    const latest = await em.findOne(
      CandidateProfileVersionSchema,
      { candidateId },
      { orderBy: { versionNumber: 'desc' } },
    );
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const snapshot = this.buildSnapshot(view);

    const version = em.create(CandidateProfileVersionSchema, {
      candidateId,
      versionNumber,
      profileData: snapshot as unknown as Record<string, unknown>,
      createdAt: new Date(),
    });
    em.persist(version);
    await em.flush();

    await em.nativeUpdate(ApplicationSchema, liveWhere, {
      profileVersionId: version.id,
    });

    return { id: version.id, versionNumber };
  }
}
