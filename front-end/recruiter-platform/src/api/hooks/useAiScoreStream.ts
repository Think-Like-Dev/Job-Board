import { useEffect } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

import { ENV } from "@/config/env.config";
import type {
  AiScoreAssessment,
  JobApplicationDetail,
} from "@/types/application.types";
import { QUERY_KEYS } from "./queryKeys";

/** One message of `GET /applications/:id/ai-score/stream`. */
interface AiScoreStreamEvent {
  kind: "assessment" | "heartbeat";
  applicationId: string;
  /** Present on an `assessment`. */
  assessment?: AiScoreAssessment;
  /** Present on a `heartbeat`. */
  sentAt?: string;
}

/**
 * Keeps one application's AI assessment live.
 *
 * The drawer opens a Server-Sent Events stream for the application it shows.
 * The API sends the stored assessment first and then every result as it is
 * stored, so a score that arrives while the drawer is open appears without a
 * reload.
 *
 * The connection exists only while the drawer is open. When the network
 * drops, the browser reconnects on its own; nothing is retried here.
 */
export function useAiScoreStream(applicationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!applicationId) {
      return;
    }

    const source = new EventSource(
      `${ENV.API_BASE_URL}/applications/${applicationId}/ai-score/stream`,
      { withCredentials: true },
    );

    source.onmessage = (message) => {
      let event: AiScoreStreamEvent;
      try {
        event = JSON.parse(message.data) as AiScoreStreamEvent;
      } catch {
        return;
      }

      if (event.kind !== "assessment" || !event.assessment) {
        return;
      }

      applyAssessment(queryClient, applicationId, event.assessment);
    };

    return () => source.close();
  }, [applicationId, queryClient]);
}

/**
 * Writes a new assessment into the caches the drawer and the table read.
 *
 * The detail is updated in place (the drawer re-renders without a request);
 * the lists are invalidated so the score column catches up too.
 */
function applyAssessment(
  queryClient: QueryClient,
  applicationId: string,
  assessment: AiScoreAssessment,
): void {
  queryClient.setQueryData<JobApplicationDetail>(
    QUERY_KEYS.APPLICATIONS.DETAIL(applicationId),
    (current) =>
      current
        ? {
            ...current,
            aiAssessment: assessment,
            aiScore: {
              status: assessment.status,
              score: assessment.score,
            },
          }
        : current,
  );

  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.APPLICATIONS.LISTS,
  });
}
