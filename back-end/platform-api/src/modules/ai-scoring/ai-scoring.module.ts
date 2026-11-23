import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApplicationAiScoreSchema } from './application-ai-score.schema';
import { AiScoringProjectionService } from './ai-scoring-projection.service';
import { AiScoringResultsConsumer } from './ai-scoring-results.consumer';

/**
 * The projection of the AI service's assessment.
 *
 * The AI service scores an application in its own database. This module
 * receives the result, stores it in the core database and hands it to the
 * recruiter API. It computes nothing itself.
 */
@Module({
  imports: [MikroOrmModule.forFeature([ApplicationAiScoreSchema])],
  providers: [AiScoringProjectionService, AiScoringResultsConsumer],
  exports: [AiScoringProjectionService],
})
export class AiScoringModule {}
