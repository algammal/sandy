import type { ClientSubmissionBundle } from "@sandy/shared-types";
import type { AppDispatch } from "../index";
import { upsertClientFromBundle } from "../slices/clientsSlice";
import { setBusinessInfoFromBundle } from "../slices/businessInfoSlice";
import { setAgentRequestsForClient } from "../slices/agentRequestsSlice";
import { generateDraftsForClient } from "../slices/agentConfigurationsSlice";
import { recordActivity } from "../../services/activityLog";

/**
 * The single entry point for bringing a client-portal submission bundle
 * into the internal dashboard: materializes the client record, stores their
 * business data, records the agents they requested, and immediately
 * auto-generates one configuration draft per requested agent so staff never
 * start from a blank workspace. Every step here is local Redux state — see
 * `ClientSubmissionBundle` and the submission-bridge services for why this
 * is a manual import rather than something that happens automatically
 * across the two separate-origin apps.
 */
export function importSubmissionBundle(bundle: ClientSubmissionBundle) {
  return (dispatch: AppDispatch) => {
    dispatch(upsertClientFromBundle(bundle));
    dispatch(setBusinessInfoFromBundle(bundle));
    dispatch(setAgentRequestsForClient({ clientId: bundle.client.id, requests: bundle.agentRequests }));
    dispatch(
      generateDraftsForClient({
        contexts: bundle.agentRequests.map((agentRequest) => ({
          client: {
            id: bundle.client.id,
            name: bundle.client.name,
            businessCategory: bundle.client.businessCategory,
            contactEmail: bundle.client.contactEmail,
            contactPhone: bundle.client.contactPhone,
            submissionStatus: "submitted" as const,
            agentStatus: "not_configured" as const,
            propertyCount: bundle.properties.length,
            compoundCount: bundle.compounds.length,
            locationCount: bundle.locations.length,
            contactNumberCount: bundle.contacts.length,
            createdAt: bundle.submittedAt,
            updatedAt: bundle.submittedAt,
          },
          businessProfile: bundle.businessProfile,
          properties: bundle.properties,
          compounds: bundle.compounds,
          faqs: bundle.faqs,
          contacts: bundle.contacts,
          agentRequest,
        })),
      }),
    );
    recordActivity({
      clientId: bundle.client.id,
      actorType: "client",
      actorName: bundle.client.name,
      action: "submission_imported",
      description: `${bundle.client.name}'s submission was imported with ${bundle.agentRequests.length} requested agent(s).`,
    });
  };
}
