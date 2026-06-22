export type PortalFeedbackActionState = {
  error: string | null;
  success?: boolean;
};

export const portalFeedbackInitialState: PortalFeedbackActionState = {
  error: null,
};
