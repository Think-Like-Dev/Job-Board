import type { CandidateProfileDto } from './dto/profile-response.dto';
import type { ProfileView } from './profile.types';

export function toProfileDto(view: ProfileView): CandidateProfileDto {
  return {
    id: view.id,
    email: view.email,
    firstName: view.firstName ?? null,
    lastName: view.lastName ?? null,
    phone: view.phone ?? null,
    currentLocation: view.currentLocation ?? null,
    address: view.address ?? null,
    city: view.city ?? null,
    state: view.state ?? null,
    country: view.country ?? null,
    postalCode: view.postalCode ?? null,
    linkedinUrl: view.linkedinUrl ?? null,
    portfolioUrl: view.portfolioUrl ?? null,
    profileImage: view.profileImage ?? null,
    resume: view.resume ?? null,
    coverLetter: view.coverLetter ?? null,
    education: view.education,
    experience: view.experience,
    skills: view.skills,
    certifications: view.certifications,
    versionNumber: view.versionNumber,
    capturedAt: view.capturedAt,
  };
}
