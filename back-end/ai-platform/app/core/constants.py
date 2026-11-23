"""Values shared by models, scoring, and services."""

# Default vector size for the embedding model. The live value is configuration
# (`AI_EMBEDDING_DIM`, see `app/core/config.py`) because the model is
# swappable; this constant is the fallback and the number the Alembic
# migrations are written against.
EMBEDDING_DIM = 384

EXTRACTION_VERSION = "v1"
WEIGHTS_VERSION = "v2"
