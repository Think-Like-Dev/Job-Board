/**
 * Candidate lifecycle, mirrored from the API.
 *
 * `INVITED` is a profile a recruiter created before the person signed in; it
 * is the only state that can be hard-deleted. `ACTIVE` means the candidate
 * has completed at least one OTP sign-in.
 */
export enum CandidateStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
}
