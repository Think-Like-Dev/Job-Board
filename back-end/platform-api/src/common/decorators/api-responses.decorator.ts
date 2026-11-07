import { ApiNotFoundResponse } from '@nestjs/swagger';

/**
 * Shared 404 responses for resources whose text is repeated across routes.
 * Route-specific 404 descriptions stay inline.
 */
export const ApiJobNotFound = () =>
  ApiNotFoundResponse({ description: 'Job not found' });

export const ApiApplicationNotFound = () =>
  ApiNotFoundResponse({ description: 'Application not found' });
